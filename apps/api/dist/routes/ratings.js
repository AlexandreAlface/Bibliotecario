"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/ratings.js
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const _helpers_js_1 = require("./_helpers.js");
const utils_js_1 = require("../reco/utils.js");
const embeddings_js_1 = require("../ai/embeddings.js");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * GET /api/ratings/pending?childId=&familyId=&limit=
 */
router.get("/pending", async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;
    try {
        const cid = await (0, _helpers_js_1.resolveChildId)({ prisma, childId, familyId });
        if (!cid)
            return res.status(400).json({ error: "missing_child" });
        const userId = (req.user && Number(req.user.id)) ||
            (req.session && Number(req.session.userId)) ||
            Number(req.headers["x-user-id"]) ||
            Number(req.query.userId) ||
            null;
        // 🔧 1) Reservas atuais (status: reserved/reading)
        // 🔧 2) Leituras terminadas mais recentes por livro (status: finished)
        const rows = await prisma.$queryRaw `
      WITH pending AS (
        SELECT
          br.id               AS "reservationId",
          br."reservedAt"     AS "reservedAt",
          b."isbn"            AS "isbn",
          b."title"           AS "title",
          b."coverUrl"        AS "coverUrl",
          rr."id"             AS "readingId",
          rr."startedAt"      AS "startedAt",
          rr."finishedAt"     AS "finishedAt",
          ur."stars"          AS "stars",
          ur."comment"        AS "comment",
          ur."ratedAt"        AS "ratedAt",
          br."reservedAt"     AS "sortDate"
        FROM "BookReservation" br
        JOIN "Book" b
          ON b."isbn" = br."bookIsbn"
        LEFT JOIN LATERAL (
          SELECT r2."id", r2."startedAt", r2."finishedAt"
          FROM "Reading" r2
          WHERE r2."reservationId" = br."id"
            AND r2."finishedAt" IS NULL      -- apenas leitura aberta
          ORDER BY r2."id" DESC
          LIMIT 1
        ) rr ON TRUE
        LEFT JOIN LATERAL (
          SELECT rt."stars", rt."comment", rt."ratedAt"
          FROM "Rating" rt
          WHERE rt."userId" = ${userId}
            AND rt."childId" = ${cid}
            AND rt."bookIsbn" = br."bookIsbn"
          ORDER BY rt."ratedAt" DESC
          LIMIT 1
        ) ur ON TRUE
        WHERE br."childId" = ${cid}
      ),
      finished AS (
        SELECT
          NULL::int           AS "reservationId",
          NULL::timestamp     AS "reservedAt",
          b."isbn"            AS "isbn",
          b."title"           AS "title",
          b."coverUrl"        AS "coverUrl",
          r."id"              AS "readingId",
          r."startedAt"       AS "startedAt",
          r."finishedAt"      AS "finishedAt",
          ur."stars"          AS "stars",
          ur."comment"        AS "comment",
          ur."ratedAt"        AS "ratedAt",
          r."finishedAt"      AS "sortDate"
        FROM (
          -- última leitura terminada por livro
          SELECT DISTINCT ON (rr."bookIsbn")
            rr."id", rr."childId", rr."bookIsbn", rr."startedAt", rr."finishedAt"
          FROM "Reading" rr
          WHERE rr."childId" = ${cid} AND rr."finishedAt" IS NOT NULL
          ORDER BY rr."bookIsbn", rr."finishedAt" DESC
        ) r
        JOIN "Book" b ON b."isbn" = r."bookIsbn"
        LEFT JOIN LATERAL (
          SELECT rt."stars", rt."comment", rt."ratedAt"
          FROM "Rating" rt
          WHERE rt."userId" = ${userId}
            AND rt."childId" = ${cid}
            AND rt."bookIsbn" = r."bookIsbn"
          ORDER BY rt."ratedAt" DESC
          LIMIT 1
        ) ur ON TRUE
      )
      SELECT * FROM pending
      UNION ALL
      SELECT * FROM finished
      ORDER BY "sortDate" DESC NULLS LAST
      LIMIT ${limit};
    `;
        const out = rows.map((r) => {
            const status = r.finishedAt
                ? "finished"
                : r.startedAt
                    ? "reading"
                    : "reserved";
            return {
                reservationId: r.reservationId ?? null,
                isbn: r.isbn,
                title: r.title,
                coverUrl: r.coverUrl ?? null,
                status,
                startedAt: r.startedAt ?? null,
                finishedAt: r.finishedAt ?? null,
                stars: r.stars != null ? Number(r.stars) : null,
                comment: r.comment ?? null,
                ratedAt: r.ratedAt ?? null,
                readingId: r.readingId ?? null,
            };
        });
        res.json(out);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
/**
 * POST /api/ratings
 * body: { isbn, stars, comment?, childId?, familyId? }
 * - primeira avaliação: exige leitura terminada
 * - reavaliação (update): não exige leitura terminada
 */
router.post("/", async (req, res) => {
    const body = zod_1.default
        .object({
        isbn: zod_1.default.string().min(5),
        stars: zod_1.default.number().min(1).max(5),
        comment: zod_1.default.string().optional(),
        childId: zod_1.default.number().optional(),
        familyId: zod_1.default.number().optional(),
    })
        .parse(req.body);
    let userId = (req.user && Number(req.user.id)) ||
        (req.session && Number(req.session.userId)) ||
        Number(req.headers["x-user-id"]) ||
        Number(req.query.userId) ||
        null;
    // ⇩ em contexto de família, usa o familyId como autor da avaliação
    const familyIdInline = typeof body.familyId === "number"
        ? body.familyId
        : req.query.familyId
            ? Number(req.query.familyId)
            : undefined;
    if (!userId && familyIdInline)
        userId = familyIdInline;
    if (!userId)
        return res.status(401).json({ error: "unauthenticated" });
    try {
        const cid = await (0, _helpers_js_1.resolveChildId)({
            prisma,
            childId: body.childId,
            familyId: familyIdInline,
        });
        if (!cid)
            return res.status(400).json({ error: "missing_child" });
        const row = await prisma.$transaction(async (tx) => {
            // rating anterior deste user para este filho e este livro?
            const existing = await tx.rating.findFirst({
                where: { userId, childId: cid, bookIsbn: body.isbn },
                select: { id: true, readingId: true },
                orderBy: { ratedAt: "desc" },
            });
            // leitura terminada mais recente (se existir)
            const finished = await tx.reading.findFirst({
                where: { childId: cid, bookIsbn: body.isbn, finishedAt: { not: null } },
                select: { id: true },
                orderBy: { id: "desc" },
            });
            if (existing) {
                // UPDATE (reavaliar) — não exige leitura terminada
                return tx.rating.update({
                    where: { id: existing.id },
                    data: {
                        stars: body.stars,
                        comment: body.comment ?? null,
                        ratedAt: new Date(),
                        readingId: finished?.id ?? existing.readingId ?? null,
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
            }
            // CREATE (primeira avaliação) — aqui sim exigimos leitura terminada
            if (!finished) {
                const err = new Error("reading_not_finished");
                // @ts-ignore
                err.code = "reading_not_finished";
                throw err;
            }
            return tx.rating.create({
                data: {
                    userId,
                    childId: cid,
                    readingId: finished.id,
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
        });
        // ⬇️ atualiza o perfil de afinidades da criança (inclui repetições)
        await recomputeChildPreferenceFromRatings(prisma, cid);
        res.json({ ok: true, rating: row });
    }
    catch (e) {
        console.error(e);
        if (e?.code === "reading_not_finished" ||
            e?.message === "reading_not_finished") {
            return res.status(400).json({ error: "reading_not_finished" });
        }
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
function asNumArray(v) {
    if (!v)
        return null;
    if (Array.isArray(v))
        return v.map(Number);
    if (typeof v === "string") {
        const s = v.replace(/^\s*\[|\]\s*$/g, "");
        if (!s)
            return null;
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
        if (!v || !v.length || !Number.isFinite(w) || w === 0)
            continue;
        if (!acc)
            acc = Array.from(v, () => 0);
        for (let j = 0; j < acc.length; j++)
            acc[j] += v[j] * w;
        sumW += w;
    }
    if (!acc || sumW === 0)
        return null;
    for (let j = 0; j < acc.length; j++)
        acc[j] /= sumW;
    return acc;
}
/**
 * Recalcula o ChildPreference a partir das avaliações
 * Peso = estrelas + recência do rating + (opcional) recência da leitura
 *        e bónus por repetições (reservas/leituras terminadas)
 */
async function recomputeChildPreferenceFromRatings(prisma, childId) {
    // trouxe também contagens e última leitura terminada por livro para este child
    const rows = await prisma.$queryRaw `
    SELECT
      b.embedding::text AS embedding,
      r."stars",
      r."ratedAt",
      rc.read_count::int  AS "readCount",
      res.res_count::int  AS "resCount",
      rc.last_finished    AS "lastFinished"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS read_count,
             MAX("finishedAt") AS last_finished
      FROM "Reading" rr
      WHERE rr."childId" = r."childId"
        AND rr."bookIsbn" = r."bookIsbn"
        AND rr."finishedAt" IS NOT NULL
    ) rc ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS res_count
      FROM "BookReservation" br
      WHERE br."childId" = r."childId"
        AND br."bookIsbn" = r."bookIsbn"
    ) res ON TRUE
    WHERE r."childId" = ${childId}
      AND b.embedding IS NOT NULL
    ORDER BY r."ratedAt" DESC
    LIMIT 200;
  `;
    if (!rows.length)
        return false;
    const now = Date.now();
    const vecs = [];
    const weights = [];
    for (const r of rows) {
        const v = asNumArray(r.embedding);
        if (!v)
            continue;
        const stars = Number(r.stars || 0); // 1..5
        const ageDays = Math.max(0, (now - new Date(r.ratedAt).getTime()) / 86400000);
        const recencyRating = Math.exp(-ageDays / 180); // meia-vida ~6 meses
        const lastFinished = r.lastFinished
            ? new Date(r.lastFinished).getTime()
            : null;
        const daysSinceFinished = lastFinished
            ? Math.max(0, (now - lastFinished) / 86400000)
            : null;
        const recencyFinished = daysSinceFinished != null ? Math.exp(-daysSinceFinished / 120) : 1.0; // meia-vida 4 meses
        const starGain = Math.max(0, Math.min(1, (stars - 2) / 3)); // 1..5 → 0..1 (<=2 dá 0)
        const resCount = Math.max(0, Number(r.resCount || 0));
        const readCount = Math.max(0, Number(r.readCount || 0));
        // bónus por repetição, capado
        const repeatBonus = 1.0 +
            Math.min(0.25, 0.05 * resCount) + // até +25% via reservas
            Math.min(0.35, 0.08 * readCount); // até +35% via leituras terminadas
        const w = (0.2 + starGain) * recencyRating * recencyFinished * repeatBonus;
        if (w > 0) {
            vecs.push(v);
            weights.push(w);
        }
    }
    const centroid = weightedCentroid(vecs, weights);
    if (!centroid)
        return false;
    // ---- mistura embedding do texto dos comentários positivos (opcional) ----
    const comm = await prisma.rating.findMany({
        where: { childId, stars: { gte: 4 }, comment: { not: null } },
        select: { comment: true },
        orderBy: { ratedAt: "desc" },
        take: 20,
    });
    if (comm.length) {
        const text = comm
            .map((c) => c.comment)
            .filter(Boolean)
            .join("\n");
        try {
            const textVec = await (0, embeddings_js_1.embedOne)(`Comentários de livros de que gostei: ${text}`);
            const alpha = 0.2; // 20% texto, 80% livros
            const L = Math.min(centroid.length, textVec.length);
            for (let i = 0; i < L; i++) {
                centroid[i] = centroid[i] * (1 - alpha) + textVec[i] * alpha;
            }
        }
        catch (e) {
            console.error("embedOne(comments) falhou:", e);
            // segue só com o centroid calculado pelas avaliações
        }
    }
    // ---- gravar no ChildPreference ----
    const v = (0, utils_js_1.toSqlVector)(centroid);
    await prisma.$executeRaw `
    INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
    VALUES (
      ${childId},
      ${"Gerado a partir de avaliações (estrelas+recência+repetições) + comentários"},
      ${v}::vector,
      now()
    )
    ON CONFLICT ("childId")
    DO UPDATE SET
      "profileText" = EXCLUDED."profileText",
      "embedding"   = EXCLUDED."embedding",
      "updatedAt"   = now();
  `;
    return true;
}
