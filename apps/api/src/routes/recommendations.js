import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import z from "zod";
import { embedOne } from "../ai/embeddings.js";
import {
  buildProfileText,
  toSqlVector,
  weightedCentroid,
} from "../reco/utils.js";

const prisma = new PrismaClient();
const router = Router();

const QuizBodySchema = z.object({
  answers: z.array(z.object({ id: z.string(), value: z.unknown() })).nonempty(),
});

function clampPerPage(x) {
  const v = Number(x ?? 12);
  return Math.min(48, Math.max(6, Number.isFinite(v) ? v : 12));
}
function normPage(x) {
  const v = Number(x ?? 1);
  return Math.max(1, Number.isFinite(v) ? v : 1);
}

function avgVec(vecs) {
  if (!vecs?.length) return null;
  const n = vecs.length;
  const acc = Array.from(vecs[0], () => 0);
  for (const v of vecs)
    for (let i = 0; i < acc.length; i++) acc[i] += Number(v[i] || 0);
  for (let i = 0; i < acc.length; i++) acc[i] /= n;
  return acc;
}
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
function yearsOld(dob) {
  if (!dob) return undefined;
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return Math.max(0, y);
}

/* ===========================================
   POST /recommendations/quiz
   Query: ?perPage=12&page=1&childId=&familyId=
   Body: { answers: [...] }
   Res: { items: [...], total }
=========================================== */
router.post("/recommendations/quiz", async (req, res) => {
  let body;
  try {
    body = QuizBodySchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: "bad_body", details: e.errors });
  }

  const answers = body.answers;
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const offset = (page - 1) * perPage;

  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const profile = buildProfileText(answers);
    const vec = await embedOne(profile);
    const v = toSqlVector(vec);

    // idade vinda do quiz (ex.: "6-8")
    const ageRange = answers.find(
      (a) => a.id === "age" || a.id === "ageRange"
    )?.value;
    let min, max;
    const m =
      typeof ageRange === "string" ? ageRange.match(/^(\d+)\s*-\s*(\d+)$/) : null;
    if (m) {
      min = Number(m[1]);
      max = Number(m[2]);
    }
    const minI = Number.isFinite(min) ? Number(min) : null;
    const maxI = Number.isFinite(max) ? Number(max) : null;

    // filtros comuns (para COUNT e para a query vetorial)
    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${minI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxI}::int)
        AND (${maxI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minI}::int)
        AND NOT EXISTS (
          SELECT 1
          FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (
              (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
              OR
              (${familyId ?? null}::int IS NOT NULL AND rblock."childId" IN (
                SELECT cf."childId" FROM "ChildFamily" cf WHERE cf."familyId" = ${familyId}
              ))
            )
        );
    `;

    const rows = await prisma.$queryRaw`
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${minI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxI}::int)
        AND (${maxI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minI}::int)
        AND NOT EXISTS (
          SELECT 1
          FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (
              (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
              OR
              (${familyId ?? null}::int IS NOT NULL AND rblock."childId" IN (
                SELECT cf."childId" FROM "ChildFamily" cf WHERE cf."familyId" = ${familyId}
              ))
            )
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${perPage} OFFSET ${offset};
    `;

    const items = rows.map((r) => ({
      isbn: r.isbn,
      title: r.title,
      coverUrl: r.coverUrl ?? undefined,
      summary: r.summary ?? null,
      score: Number((r.score ?? 0).toFixed(3)),
      why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(Boolean),
    }));

    res.json({ items, total: (totalRows?.[0]?.total ?? items.length) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================
   GET /recommendations/profile
   Query: ?perPage=12&page=1&childId=&familyId=
   Res: { items: [...], total }
=========================================== */
router.get("/recommendations/profile", async (req, res) => {
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const offset = (page - 1) * perPage;

  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    let queryVec = null;
    let minAge = null;
    let maxAge = null;

    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { birthDate: true },
      });
      const age = yearsOld(child && child.birthDate);
      if (Number.isFinite(age)) {
        minAge = age;
        maxAge = age;
      }

      const pref = await prisma.$queryRaw`
        SELECT embedding::text AS embedding
        FROM "ChildPreference"
        WHERE "childId"=${childId} AND embedding IS NOT NULL
        LIMIT 1;
      `;
      queryVec = asNumArray(pref && pref[0] && pref[0].embedding);

      if (!queryVec) {
        const rowsRt = await prisma.$queryRaw`
          SELECT b.embedding::text AS embedding, r."stars", r."ratedAt"
          FROM "Rating" r
          JOIN "Book" b ON b."isbn" = r."bookIsbn"
          WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL
          ORDER BY r."ratedAt" DESC
          LIMIT 100;
        `;
        if (rowsRt.length) {
          const now = Date.now();
          const vecs = [];
          const weights = [];
          for (const r of rowsRt) {
            const v = asNumArray(r.embedding);
            if (!v) continue;
            const stars = Number(r.stars || 0);
            const ageDays = Math.max(
              0,
              (now - new Date(r.ratedAt).getTime()) / 86400000
            );
            const recency = Math.exp(-ageDays / 180);
            const starGain = Math.max(0, (stars - 2) / 3);
            const w = (0.2 + starGain) * recency;
            vecs.push(v);
            weights.push(w);
          }
          queryVec = weightedCentroid(vecs, weights) || null;
        }
      }

      if (!queryVec) {
        const rows = await prisma.$queryRaw`
          SELECT b.embedding::text AS embedding
          FROM "Book" b
          WHERE b.embedding IS NOT NULL
            AND (${minAge}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAge}::int)
            AND (${maxAge}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAge}::int)
          LIMIT 200;
        `;
        const vecs = rows.map((r) => asNumArray(r.embedding)).filter(Boolean);
        queryVec = avgVec(vecs) || null;

        if (queryVec) {
          const v = toSqlVector(queryVec);
          await prisma.$executeRaw`
            INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
            VALUES (${childId}, ${"Bootstrap por idade"}, ${v}::vector, now())
            ON CONFLICT ("childId")
            DO UPDATE SET
              "profileText" = EXCLUDED."profileText",
              "embedding"   = EXCLUDED."embedding",
              "updatedAt"   = now();
          `;
        }
      }
    } else if (familyId) {
      const kids = await prisma.childFamily.findMany({
        where: { familyId },
        select: { childId: true, child: { select: { birthDate: true } } },
      });

      const rowsPref = await prisma.$queryRaw`
        SELECT cp.embedding::text AS embedding
        FROM "ChildPreference" cp
        JOIN "ChildFamily" cf ON cf."childId" = cp."childId"
        WHERE cf."familyId"=${familyId} AND cp.embedding IS NOT NULL;
      `;
      let vecs = rowsPref.map((r) => asNumArray(r.embedding)).filter(Boolean);

      if (!vecs.length && kids.length) {
        const perKid = [];
        for (const k of kids) {
          const age = yearsOld(k.child && k.child.birthDate);
          if (!Number.isFinite(age)) continue;
          const rows = await prisma.$queryRaw`
            SELECT b.embedding::text AS embedding
            FROM "Book" b
            WHERE b.embedding IS NOT NULL
              AND (b."ageMin" IS NULL OR b."ageMin" <= ${age}::int)
              AND (b."ageMax" IS NULL OR b."ageMax" >= ${age}::int)
            LIMIT 120;
          `;
          const vks = rows.map((r) => asNumArray(r.embedding)).filter(Boolean);
          const centroid = avgVec(vks);
          if (centroid) perKid.push(centroid);
        }
        vecs = perKid;
      }

      queryVec = avgVec(vecs) || null;
    }

    const minAgeI = Number.isFinite(minAge) ? Number(minAge) : null;
    const maxAgeI = Number.isFinite(maxAge) ? Number(maxAge) : null;

    // COUNT geral (para paginação), com os mesmos filtros
    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${minAgeI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAgeI}::int)
        AND (${maxAgeI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAgeI}::int)
        AND NOT EXISTS (
          SELECT 1
          FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (
              (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
              OR
              (${familyId ?? null}::int IS NOT NULL AND rblock."childId" IN (
                SELECT cf."childId" FROM "ChildFamily" cf WHERE cf."familyId" = ${familyId}
              ))
            )
        );
    `;

    // Sem vetor -> fallback neutro (recente)
    if (!queryVec) {
      const rows = await prisma.$queryRaw`
        SELECT b."isbn", b."title", b."coverUrl", b."summary", 0.0 AS score
        FROM "Book" b
        WHERE b.embedding IS NOT NULL
          AND (${minAgeI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAgeI}::int)
          AND (${maxAgeI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAgeI}::int)
        ORDER BY b."publicationYear" DESC NULLS LAST, b."isbn" DESC
        LIMIT ${perPage} OFFSET ${offset};
      `;
      const items = rows.map((r) => ({
        isbn: r.isbn,
        title: r.title,
        coverUrl: r.coverUrl ?? undefined,
        summary: r.summary ?? null,
        score: Number(r.score),
      }));
      return res.json({
        items,
        total: totalRows?.[0]?.total ?? items.length,
      });
    }

    // Vetorial com paginação
    const v = toSqlVector(queryVec);

    const rows = await prisma.$queryRaw`
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${minAgeI}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${maxAgeI}::int)
        AND (${maxAgeI}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${minAgeI}::int)
        AND NOT EXISTS (
          SELECT 1
          FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (
              (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
              OR
              (${familyId ?? null}::int IS NOT NULL AND rblock."childId" IN (
                SELECT cf."childId" FROM "ChildFamily" cf WHERE cf."familyId" = ${familyId}
              ))
            )
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${perPage} OFFSET ${offset};
    `;

    const items = rows.map((r) => ({
      isbn: r.isbn,
      title: r.title,
      coverUrl: r.coverUrl ?? undefined,
      summary: r.summary ?? null,
      score: Number((r.score ?? 0).toFixed(3)),
      why: [],
    }));
    res.json({
      items,
      total: totalRows?.[0]?.total ?? items.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
