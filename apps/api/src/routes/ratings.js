// apps/api/src/routes/ratings.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import z from "zod";
import { resolveChildId } from "./_helpers.js";
import { toSqlVector } from "../reco/utils.js";
import { embedOne } from "../ai/embeddings.js"; // ⬅️ adicionar

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/ratings/pending?childId=&familyId=&limit=
 */
router.get("/pending", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const cid = await resolveChildId({ prisma, childId, familyId });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const userId =
      (req.user && Number(req.user.id)) ||
      (req.session && Number(req.session.userId)) ||
      Number(req.headers["x-user-id"]) ||
      Number(req.query.userId) ||
      null;

    const rows = await prisma.$queryRaw`
      SELECT br.id AS "reservationId", br."reservedAt",
             b."isbn", b."title", b."coverUrl",
             r."id" AS "readingId", r."startedAt", r."finishedAt",
             (SELECT MAX(rt."stars") FROM "Rating" rt
               WHERE rt."userId" = ${userId} AND rt."bookIsbn" = br."bookIsbn") AS "stars"
      FROM "BookReservation" br
      JOIN "Book" b ON b."isbn" = br."bookIsbn"
      LEFT JOIN LATERAL (
        SELECT r2."id", r2."startedAt", r2."finishedAt"
        FROM "Reading" r2
        WHERE r2."childId" = ${cid} AND r2."bookIsbn" = br."bookIsbn"
        ORDER BY r2."id" DESC
        LIMIT 1
      ) r ON TRUE
      WHERE br."childId" = ${cid}
      ORDER BY br."reservedAt" DESC
      LIMIT ${limit};
    `;

    const out = rows.map((r) => {
      const status = r.finishedAt
        ? "finished"
        : r.startedAt
        ? "reading"
        : "reserved";
      return {
        reservationId: r.reservationId,
        isbn: r.isbn,
        title: r.title,
        coverUrl: r.coverUrl ?? undefined,
        status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        stars: r.stars ? Number(r.stars) : null,
        readingId: r.readingId ?? null,
      };
    });

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/ratings
 * body: { isbn, stars, comment?, childId?, familyId? }
 * exige uma leitura terminada para (childId, isbn)
 */
router.post("/", async (req, res) => {
  const body = z
    .object({
      isbn: z.string().min(5),
      stars: z.number().min(1).max(5),
      comment: z.string().optional(),
      childId: z.number().optional(),
      familyId: z.number().optional(),
    })
    .parse(req.body);

  let userId =
    (req.user && Number(req.user.id)) ||
    (req.session && Number(req.session.userId)) ||
    Number(req.headers["x-user-id"]) ||
    Number(req.query.userId) ||
    null;

  // ⇩ em contexto de família, usa o familyId como autor da avaliação
  const familyIdInline =
    typeof body.familyId === "number"
      ? body.familyId
      : req.query.familyId
      ? Number(req.query.familyId)
      : undefined;
  if (!userId && familyIdInline) userId = familyIdInline;

  if (!userId) return res.status(401).json({ error: "unauthenticated" });

  try {
    const cid = await resolveChildId({
      prisma,
      childId: body.childId,
      familyId: familyIdInline,
    });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const finished = await prisma.reading.findFirst({
      where: { childId: cid, bookIsbn: body.isbn, finishedAt: { not: null } },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    if (!finished)
      return res.status(400).json({ error: "reading_not_finished" });

    const row = await prisma.rating.create({
      data: {
        userId,
        childId: cid, // 👈 liga a avaliação à criança
        readingId: finished.id, // 👈 e à sessão de leitura
        bookIsbn: body.isbn,
        stars: body.stars,
        comment: body.comment ?? null,
      },
      select: {
        id: true,
        stars: true,
        comment: true,
        ratedAt: true,
        childId: true,
        readingId: true,
      },
    });

    await recomputeChildPreferenceFromRatings(prisma, cid);

    res.json({ ok: true, rating: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;

function asNumArray(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === "string") {
    const s = v.replace(/^\s*\[|\]\s*$/g, "");
    if (!s) return null;
    const arr = s.split(",").map((x) => Number(x.trim()));
    return arr.every((n) => Number.isFinite(n)) ? arr : null;
  }
  return null;
}

function weightedCentroid(vecs, weights) {
  let sumW = 0;
  let acc = null;
  for (let i = 0; i < vecs.length; i++) {
    const v = vecs[i];
    const w = Math.max(0, Number(weights[i] || 0));
    if (!v || !v.length || !Number.isFinite(w) || w === 0) continue;
    if (!acc) acc = Array.from(v, () => 0);
    for (let j = 0; j < acc.length; j++) acc[j] += v[j] * w;
    sumW += w;
  }
  if (!acc || sumW === 0) return null;
  for (let j = 0; j < acc.length; j++) acc[j] /= sumW;
  return acc;
}

/** Recalcula o ChildPreference a partir das avaliações (peso por estrelas e recência) */
async function recomputeChildPreferenceFromRatings(prisma, childId) {
  const rows = await prisma.$queryRaw`
    SELECT b.embedding::text AS embedding, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY r."ratedAt" DESC
    LIMIT 100;
  `;
  if (!rows.length) return false;

  // ---- centroido a partir das avaliações (peso por estrelas + recência) ----
  const now = Date.now();
  const vecs = [];
  const weights = [];

  for (const r of rows) {
    const v = asNumArray(r.embedding);
    if (!v) continue;

    const stars = Number(r.stars || 0);                 // 1..5
    const ageDays = Math.max(0, (now - new Date(r.ratedAt).getTime()) / 86400000);
    const recency = Math.exp(-ageDays / 180);           // meia-vida ~6 meses
    const starGain = Math.max(0, Math.min(1, (stars - 2) / 3)); // 1..5 → 0..1 (<=2 dá 0)
    const w = (0.2 + starGain) * recency;              // base 0.2 + ganho por estrelas, atenuado pela recência

    vecs.push(v);
    weights.push(w);
  }

  const centroid = weightedCentroid(vecs, weights);
  if (!centroid) return false;

  // ---- (opcional) mistura o embedding do texto dos comentários positivos ----
  const comm = await prisma.rating.findMany({
    where: { childId, stars: { gte: 4 }, comment: { not: null } },
    select: { comment: true },
    orderBy: { ratedAt: "desc" },
    take: 20,
  });

  if (comm.length) {
    const text = comm.map(c => c.comment).filter(Boolean).join("\n");
    try {
      const textVec = await embedOne(`Comentários de livros de que gostei: ${text}`);
      const alpha = 0.2; // 20% texto, 80% livros
      const L = Math.min(centroid.length, textVec.length);
      for (let i = 0; i < L; i++) centroid[i] = centroid[i] * (1 - alpha) + textVec[i] * alpha;
    } catch (e) {
      console.error("embedOne(comments) falhou:", e);
      // segue só com o centroid calculado pelas avaliações
    }
  }

  // ---- gravar no ChildPreference ----
  const v = toSqlVector(centroid);
  await prisma.$executeRaw`
    INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
    VALUES (${childId}, ${"Gerado a partir de avaliações (estrelas+recência) + comentários"}, ${v}::vector, now())
    ON CONFLICT ("childId")
    DO UPDATE SET
      "profileText" = EXCLUDED."profileText",
      "embedding"   = EXCLUDED."embedding",
      "updatedAt"   = now();
  `;

  return true;
}