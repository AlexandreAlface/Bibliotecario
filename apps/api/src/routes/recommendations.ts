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

function clampPerPage(x: any) {
  const v = Number(x ?? 12);
  return Math.min(48, Math.max(6, Number.isFinite(v) ? v : 12));
}
function normPage(x: any) {
  const v = Number(x ?? 1);
  return Math.max(1, Number.isFinite(v) ? v : 1);
}

function asNumArray(v: any): number[] | null {
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
function yearsOld(dob?: Date | null) {
  if (!dob) return undefined;
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return Math.max(0, y);
}

/* ===== Similaridade e MMR ===== */
function cosineSim(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const L = Math.min(a.length, b.length);
  for (let i = 0; i < L; i++) {
    const x = Number(a[i] || 0),
      y = Number(b[i] || 0);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
  return denom ? dot / denom : 0;
}

function mmrRerank(
  candidates: { raw: any; emb: number[]; score: number }[],
  _query: number[],
  k: number,
  lambda = 0.6
) {
  const chosen: { raw: any; emb: number[]; score: number }[] = [];
  const pool = candidates.slice();
  while (chosen.length < Math.min(k, pool.length)) {
    let bestIdx = -1,
      bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      const simToQuery = c.score; // já é cos-sim com a query
      let maxToChosen = 0;
      for (const s of chosen) {
        const sim = cosineSim(c.emb, s.emb);
        if (sim > maxToChosen) maxToChosen = sim;
      }
      const val = lambda * simToQuery - (1 - lambda) * maxToChosen;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    chosen.push(pool.splice(bestIdx, 1)[0]);
  }
  return chosen;
}

async function computeChildVector(childId: number) {
  const now = Date.now();
  const vecs: number[][] = [];
  const weights: number[] = [];

  const rated = await prisma.$queryRaw<any[]>`
    SELECT b.embedding::text AS e, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL AND r."stars" >= 4
    ORDER BY r."ratedAt" DESC
    LIMIT 200;
  `;
  for (const r of rated) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const stars = Number(r.stars || 0);
    const ageDays = (now - new Date(r.ratedAt).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 90);
    const gusto = (stars - 3) / 2;
    vecs.push(v);
    weights.push(0.3 + 0.7 * gusto * recency);
  }

  const reading = await prisma.$queryRaw<any[]>`
    SELECT b.embedding::text AS e, COALESCE(r."startedAt", now()) AS t
    FROM "Reading" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND r."finishedAt" IS NULL AND b.embedding IS NOT NULL
    LIMIT 100;
  `;
  for (const r of reading) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.t).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 60);
    vecs.push(v);
    weights.push(0.2 + 0.15 * recency);
  }

  const reserved = await prisma.$queryRaw<any[]>`
    SELECT b.embedding::text AS e, br."reservedAt" AS t
    FROM "BookReservation" br
    JOIN "Book" b ON b."isbn" = br."bookIsbn"
    WHERE br."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY br."reservedAt" DESC
    LIMIT 50;
  `;
  for (const r of reserved) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.t).getTime()) / 86400000;
    const recency = Math.exp(-ageDays / 45);
    vecs.push(v);
    weights.push(0.1 + 0.15 * recency);
  }

  let centroid = weightedCentroid(vecs, weights);
  if (!centroid) return null;

  try {
    await prisma.$executeRaw`
      INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
      VALUES (${childId}, ${"AUTO (ratings+reading+reservas)"}, ${toSqlVector(
      centroid
    )}::vector, now())
      ON CONFLICT ("childId") DO UPDATE
        SET "profileText" = EXCLUDED."profileText",
            "embedding"   = EXCLUDED."embedding",
            "updatedAt"   = now();
    `;
  } catch {}
  return centroid;
}

/* ====== Helpers de Age Flex ====== */
function withPad(minAge: number | null, maxAge: number | null, pad: number) {
  const lo = minAge == null ? null : Math.max(0, Number(minAge) - pad);
  const hi = maxAge == null ? null : Number(maxAge) + pad;
  return { effMin: lo, effMax: hi };
}

/* ===========================================
   POST /recommendations/quiz
   — sem OFFSET + MMR até page*perPage, depois slice
=========================================== */
router.post("/recommendations/quiz", async (req, res) => {
  let body: z.infer<typeof QuizBodySchema>;
  try {
    body = QuizBodySchema.parse(req.body);
  } catch (e: any) {
    return res.status(400).json({ error: "bad_body", details: e.errors });
  }

  const answers = body.answers;
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;

  try {
    const profile = buildProfileText(answers);
    const qvec = await embedOne(profile);
    const v = toSqlVector(qvec);

    // idade do quiz
    const ageRange = answers.find(
      (a) => a.id === "age" || a.id === "ageRange"
    )?.value;
    let min: number | undefined, max: number | undefined;
    const m =
      typeof ageRange === "string"
        ? ageRange.match(/^(\d+)\s*-\s*(\d+)$/)
        : null;
    if (m) {
      min = Number(m[1]);
      max = Number(m[2]);
    }
    const baseMin = Number.isFinite(min) ? Number(min) : null;
    const baseMax = Number.isFinite(max) ? Number(max) : null;

    // AGE FLEX automático (0 → ±1 → ±2)
    let pad = 0;
    let eff = withPad(baseMin, baseMax, pad);
    let totalRows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${
          eff.effMin
        }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
      eff.effMax
    }::int)
        AND (${
          eff.effMax
        }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
      eff.effMin
    }::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${
              childId ?? null
            }::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${
              childId ?? null
            }::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        );
    `;
    while ((totalRows?.[0]?.total ?? 0) < perPage && pad < 2) {
      pad += 1;
      eff = withPad(baseMin, baseMax, pad);
      totalRows = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS total
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${
            eff.effMin
          }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
        eff.effMax
      }::int)
          AND (${
            eff.effMax
          }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
        eff.effMin
      }::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${
                childId ?? null
              }::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${
                childId ?? null
              }::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          );
      `;
    }

    const takeK = page * Number(perPage); // quantos precisamos no total até esta página
    const candidateCount = Math.max(64, Math.min(400, takeK * 8));

    // ⚠️ sem OFFSET — sempre o mesmo pool determinístico
    const rows = await prisma.$queryRaw<any[]>`
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score,
             b.embedding::text AS emb
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${
          eff.effMin
        }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
      eff.effMax
    }::int)
        AND (${
          eff.effMax
        }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
      eff.effMin
    }::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${
              childId ?? null
            }::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${
              childId ?? null
            }::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${candidateCount};
    `;

    const candidates = rows
      .map((r) => ({
        raw: r,
        emb: asNumArray(r.emb)!,
        score: Number(r.score ?? 0),
      }))
      .filter((c) => Array.isArray(c.emb));

    // Seleciona até K com MMR e depois faz slice para a página
    const pickedAll = mmrRerank(candidates, qvec, takeK, 0.6);
    const start = (page - 1) * Number(perPage);
    const end = start + Number(perPage);
    const pageSlice = pickedAll.slice(start, end);

    const items = pageSlice
      .map(({ raw, score }) => ({
        isbn: raw.isbn,
        title: raw.title,
        coverUrl: raw.coverUrl ?? undefined,
        summary: raw.summary ?? null,
        score: Number(score.toFixed(3)),
        why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(
          Boolean
        ),
      }))
      .sort((a, b) => b.score - a.score); // 👈 ordenação por score

    res.json({
      items,
      total: totalRows?.[0]?.total ?? items.length,
      ageFlex: pad,
    });
  } catch (e) {
    console.error(e);
    const payload: any = { error: "internal_error" };
    if (process.env.NODE_ENV !== "production") {
      payload.message = (e as any)?.message;
      payload.details = (e as any)?.meta ?? (e as any)?.stack ?? String(e);
    }
    res.status(500).json(payload);
  }
});

/* ===========================================
   GET /recommendations/profile
   — sem OFFSET + MMR até page*perPage, depois slice
=========================================== */
router.get("/recommendations/profile", async (req, res) => {
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;

  try {
    let queryVec: number[] | null = null;
    let minAge: number | null = null;
    let maxAge: number | null = null;

    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { birthDate: true },
      });
      const age = yearsOld(child && child.birthDate);
      if (Number.isFinite(age)) {
        minAge = age!;
        maxAge = age!;
      }
      queryVec = await computeChildVector(childId);
    }

    const baseMin = Number.isFinite(minAge as any) ? Number(minAge) : null;
    const baseMax = Number.isFinite(maxAge as any) ? Number(maxAge) : null;

    // AGE FLEX automático (0 → ±1 → ±2)
    let pad = 0;
    let eff = withPad(baseMin, baseMax, pad);
    let totalRows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${
          eff.effMin
        }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
      eff.effMax
    }::int)
        AND (${
          eff.effMax
        }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
      eff.effMin
    }::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${
              childId ?? null
            }::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${
              childId ?? null
            }::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        );
    `;
    while ((totalRows?.[0]?.total ?? 0) < perPage && pad < 2) {
      pad += 1;
      eff = withPad(baseMin, baseMax, pad);
      totalRows = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS total
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${
            eff.effMin
          }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
        eff.effMax
      }::int)
          AND (${
            eff.effMax
          }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
        eff.effMin
      }::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${
                childId ?? null
              }::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${
                childId ?? null
              }::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          );
      `;
    }

    // Sem vetor → paginação simples e determinística
    if (!queryVec) {
      const offset = (page - 1) * Number(perPage);
      const rows = await prisma.$queryRaw<any[]>`
        SELECT b."isbn", b."title", b."coverUrl", b."summary", 0.0 AS score
        FROM "Book" b
        WHERE b.embedding IS NOT NULL
          AND (${
            eff.effMin
          }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
        eff.effMax
      }::int)
          AND (${
            eff.effMax
          }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
        eff.effMin
      }::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${
                childId ?? null
              }::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${
                childId ?? null
              }::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          )
        ORDER BY b."isbn" DESC
        LIMIT ${perPage} OFFSET ${offset};
      `;
      const items = rows
        .map((r) => ({
          isbn: r.isbn,
          title: r.title,
          coverUrl: r.coverUrl ?? undefined,
          summary: r.summary ?? null,
          score: Number(r.score),
        }))
        .sort((a, b) => b.score - a.score);
      return res.json({
        items,
        total: totalRows?.[0]?.total ?? items.length,
        ageFlex: pad,
      });
    }

    // Vetorial + MMR determinístico
    const v = toSqlVector(queryVec);
    const takeK = page * Number(perPage);
    const candidateCount = Math.max(64, Math.min(400, takeK * 8));

    // ⚠️ sem OFFSET — pool fixo
    const rows = await prisma.$queryRaw<any[]>`
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score,
             b.embedding::text AS emb
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${
          eff.effMin
        }::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
      eff.effMax
    }::int)
        AND (${
          eff.effMax
        }::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
      eff.effMin
    }::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${
              childId ?? null
            }::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${
              childId ?? null
            }::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${candidateCount};
    `;

    const candidates = rows
      .map((r) => ({
        raw: r,
        emb: asNumArray(r.emb)!,
        score: Number(r.score ?? 0),
      }))
      .filter((c) => Array.isArray(c.emb));

    const pickedAll = mmrRerank(candidates, queryVec, takeK, 0.6);
    const start = (page - 1) * Number(perPage);
    const end = start + Number(perPage);
    const pageSlice = pickedAll.slice(start, end);

    const items = pageSlice
      .map(({ raw, score }) => ({
        isbn: raw.isbn,
        title: raw.title,
        coverUrl: raw.coverUrl ?? undefined,
        summary: raw.summary ?? null,
        score: Number((score ?? 0).toFixed(3)),
        why: [],
      }))
      .sort((a, b) => b.score - a.score); // 👈 ordenação por score

    res.json({
      items,
      total: totalRows?.[0]?.total ?? items.length,
      ageFlex: pad,
    });
  } catch (e) {
    console.error(e);
    const payload: any = { error: "internal_error" };
    if (process.env.NODE_ENV !== "production") {
      payload.message = (e as any)?.message;
      payload.details = (e as any)?.meta ?? (e as any)?.stack ?? String(e);
    }
    res.status(500).json(payload);
  }
});

export default router;
