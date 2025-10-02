// apps/api/src/routes/recommendations.ts
// Autor: Alexandre Brissos 21131
// Objetivo: recomendações via quiz/perfil com handlers curtos, serviços e helpers puros.

import { Router, type RequestHandler } from "express";
import z from "zod";
import { prisma } from "../prisma";
import { embedOne } from "../ai/embeddings";
import { buildProfileText, toSqlVector, weightedCentroid } from "../reco/utils";

/* ============================== Tipos ============================== */
type QuizAnswer = { id: string; value: unknown };
type CandidateRow = {
  isbn: string;
  title: string;
  coverUrl: string | null;
  summary: string | null;
  score: number;
  emb: string;
};
type ItemDTO = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary: string | null;
  score: number;
  why?: string[];
};
type AgeFlex = { effMin: number | null; effMax: number | null; pad: number };

/* ============================== Schemas ============================== */
const QuizBodySchema = z.object({
  answers: z.array(z.object({ id: z.string(), value: z.unknown() })).nonempty(),
});

/* ============================== Helpers PUROS ============================== */
const clampPerPage = (v: unknown) =>
  Math.min(48, Math.max(6, Number.isFinite(Number(v)) ? Number(v) : 12));
const normPage = (v: unknown) =>
  Math.max(1, Number.isFinite(Number(v)) ? Number(v) : 1);

function asNumArray(v: unknown): number[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.map(Number);
  if (typeof v === "string") {
    const s = v.replace(/^\s*\[|\]\s*$/g, "");
    if (!s) return null;
    const arr = s.split(",").map((x) => Number(x.trim()));
    return arr.every(Number.isFinite) ? arr : null;
  }
  return null;
}

function yearsOld(dob?: Date | null) {
  if (!dob) return undefined;
  const d = new Date(dob),
    now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return Math.max(0, y);
}

const cosineSim = (a: number[], b: number[]) => {
  let dot = 0,
    na = 0,
    nb = 0,
    L = Math.min(a.length, b.length);
  for (let i = 0; i < L; i++) {
    const x = Number(a[i] || 0),
      y = Number(b[i] || 0);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
  return denom ? dot / denom : 0;
};

function mmrRerank(
  candidates: { raw: CandidateRow; emb: number[]; score: number }[],
  _query: number[],
  k: number,
  lambda = 0.6
) {
  const chosen: typeof candidates = [];
  const pool = candidates.slice();
  while (chosen.length < Math.min(k, pool.length)) {
    let bestIdx = -1,
      bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      const simToQuery = c.score; // já é cos-sim com a query
      let maxToChosen = 0;
      for (const s of chosen)
        maxToChosen = Math.max(maxToChosen, cosineSim(c.emb, s.emb));
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

const withPad = (
  minAge: number | null,
  maxAge: number | null,
  pad: number
) => ({
  effMin: minAge == null ? null : Math.max(0, minAge - pad),
  effMax: maxAge == null ? null : maxAge + pad,
  pad,
});

function getAgeRangeFromAnswers(answers: QuizAnswer[]): {
  min: number | null;
  max: number | null;
} {
  const ageRange = answers.find(
    (a) => a.id === "age" || a.id === "ageRange"
  )?.value;
  const m =
    typeof ageRange === "string" ? ageRange.match(/^(\d+)\s*-\s*(\d+)$/) : null;
  const min = m ? Number(m[1]) : null;
  const max = m ? Number(m[2]) : null;
  return {
    min: Number.isFinite(min as any) ? (min as number) : null,
    max: Number.isFinite(max as any) ? (max as number) : null,
  };
}

/* ============================== Serviços (DB) ============================== */
async function countAvailable(
  eff: { effMin: number | null; effMax: number | null },
  childId?: number
) {
  const rows = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM "Book" b
    WHERE b."embedding" IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
    eff.effMax
  }::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
    eff.effMin
  }::int)
      AND NOT EXISTS (
        SELECT 1 FROM "Reading" rblock
        WHERE rblock."bookIsbn" = b."isbn" AND rblock."finishedAt" IS NULL
          AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${
    childId ?? null
  })
      )
      AND NOT EXISTS (
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${
    childId ?? null
  })
          AND br."reservedAt" > now() - interval '30 days'
      );
  `;
  return rows?.[0]?.total ?? 0;
}

async function ensureAgeFlex(
  perPage: number,
  baseMin: number | null,
  baseMax: number | null,
  childId?: number
): Promise<AgeFlex> {
  let pad = 0,
    eff = withPad(baseMin, baseMax, pad);
  let total = await countAvailable(eff, childId);
  while (total < perPage && pad < 2) {
    pad += 1;
    eff = withPad(baseMin, baseMax, pad);
    total = await countAvailable(eff, childId);
  }
  return { ...eff, pad };
}

async function fetchCandidatesByVector(
  v: number[],
  eff: { effMin: number | null; effMax: number | null },
  candidateCount: number,
  childId?: number
) {
  const vv = toSqlVector(v);
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT b."isbn", b."title", b."coverUrl", b."summary",
           1 - (b."embedding" <=> ${vv}::vector) AS score,
           b.embedding::text AS emb
    FROM "Book" b
    WHERE b."embedding" IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
    eff.effMax
  }::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
    eff.effMin
  }::int)
      AND NOT EXISTS (
        SELECT 1 FROM "Reading" rblock
        WHERE rblock."bookIsbn" = b."isbn"
          AND rblock."finishedAt" IS NULL
          AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${
    childId ?? null
  })
      )
      AND NOT EXISTS (
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${
    childId ?? null
  })
          AND br."reservedAt" > now() - interval '30 days'
      )
    ORDER BY b."embedding" <=> ${vv}::vector
    LIMIT ${candidateCount};
  `;
}

async function fetchDeterministicPage(
  eff: { effMin: number | null; effMax: number | null },
  perPage: number,
  page: number,
  childId?: number
) {
  const offset = (page - 1) * perPage;
  return prisma.$queryRaw<
    Array<Omit<CandidateRow, "emb" | "score"> & { score: number }>
  >`
    SELECT b."isbn", b."title", b."coverUrl", b."summary", 0.0 AS score
    FROM "Book" b
    WHERE b.embedding IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${
    eff.effMax
  }::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${
    eff.effMin
  }::int)
      AND NOT EXISTS (
        SELECT 1 FROM "Reading" rblock
        WHERE rblock."bookIsbn" = b."isbn"
          AND rblock."finishedAt" IS NULL
          AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${
    childId ?? null
  })
      )
      AND NOT EXISTS (
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${
    childId ?? null
  })
          AND br."reservedAt" > now() - interval '30 days'
      )
    ORDER BY b."isbn" DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
}

/* ---- Perfil da criança (vetor) ---- */

async function computeChildVector(childId: number): Promise<number[] | null> {
  const now = Date.now();
  const vecs: number[][] = [];
  const w: number[] = [];

  const rated = await prisma.$queryRaw<
    { e: string; stars: number; ratedAt: Date }[]
  >`
    SELECT b.embedding::text AS e, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL AND r."stars" >= 4
    ORDER BY r."ratedAt" DESC LIMIT 200;
  `;
  for (const r of rated) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.ratedAt).getTime()) / 86400000;
    vecs.push(v);
    w.push(0.3 + 0.7 * ((r.stars - 3) / 2) * Math.exp(-ageDays / 90));
  }

  const reading = await prisma.$queryRaw<{ e: string; t: Date }[]>`
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
    vecs.push(v);
    w.push(0.2 + 0.15 * Math.exp(-ageDays / 60));
  }

  const reserved = await prisma.$queryRaw<{ e: string; t: Date }[]>`
    SELECT b.embedding::text AS e, br."reservedAt" AS t
    FROM "BookReservation" br
    JOIN "Book" b ON b."isbn" = br."bookIsbn"
    WHERE br."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY br."reservedAt" DESC LIMIT 50;
  `;
  for (const r of reserved) {
    const v = asNumArray(r.e);
    if (!v) continue;
    const ageDays = (now - new Date(r.t).getTime()) / 86400000;
    vecs.push(v);
    w.push(0.1 + 0.15 * Math.exp(-ageDays / 45));
  }

  const centroid = weightedCentroid(vecs, w);
  if (!centroid) return null;

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
  return centroid;
}

/* ============================== Handlers (<= 30 linhas) ============================== */

/** POST /recommendations/quiz */
const postQuiz: RequestHandler = async (req, res) => {
  const parse = QuizBodySchema.safeParse(req.body);
  if (!parse.success)
    return res
      .status(400)
      .json({ error: "bad_body", details: parse.error.issues });

  const answers = parse.data.answers as QuizAnswer[];
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;

  try {
    const profile = buildProfileText(answers);
    const qvec = await embedOne(profile);
    const { min, max } = getAgeRangeFromAnswers(answers);

    const flex = await ensureAgeFlex(perPage, min, max, childId);
    const takeK = page * perPage;
    const candidates = Math.max(64, Math.min(400, takeK * 8));
    const rows = await fetchCandidatesByVector(qvec, flex, candidates, childId);

    const pool = rows
      .map((r) => ({
        raw: r,
        emb: asNumArray(r.emb)!,
        score: Number(r.score || 0),
      }))
      .filter((c) => Array.isArray(c.emb));
    const picked = mmrRerank(pool, qvec, takeK, 0.6).slice(
      (page - 1) * perPage,
      (page - 1) * perPage + perPage
    );

    const items: ItemDTO[] = picked
      .map(({ raw, score }) => ({
        isbn: raw.isbn,
        title: raw.title,
        coverUrl: raw.coverUrl ?? undefined,
        summary: raw.summary ?? null,
        score: +Number(score).toFixed(3),
        why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(
          Boolean
        ),
      }))
      .sort((a, b) => b.score - a.score);

    return res.json({
      items,
      total: await countAvailable(flex, childId),
      ageFlex: flex.pad,
    });
  } catch (e: any) {
    const payload: any = { error: "internal_error" };
    if (process.env.NODE_ENV !== "production") {
      payload.message = e?.message;
      payload.details = e?.meta ?? e?.stack ?? String(e);
    }
    return res.status(500).json(payload);
  }
};

/** GET /recommendations/profile */
const getProfile: RequestHandler = async (req, res) => {
  const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
  const page = normPage(req.query.page);
  const childId = req.query.childId ? Number(req.query.childId) : undefined;

  try {
    let qvec: number[] | null = null,
      minAge: number | null = null,
      maxAge: number | null = null;
    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { birthDate: true },
      });
      const age = yearsOld(child?.birthDate);
      if (Number.isFinite(age)) {
        minAge = age as number;
        maxAge = age as number;
      }
      qvec = await computeChildVector(childId);
    }

    const flex = await ensureAgeFlex(perPage, minAge, maxAge, childId);
    if (!qvec) {
      const rows = await fetchDeterministicPage(flex, perPage, page, childId);
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
        total: await countAvailable(flex, childId),
        ageFlex: flex.pad,
      });
    }

    const takeK = page * perPage,
      candidates = Math.max(64, Math.min(400, takeK * 8));
    const rows = await fetchCandidatesByVector(qvec, flex, candidates, childId);
    const pool = rows
      .map((r) => ({
        raw: r,
        emb: asNumArray(r.emb)!,
        score: Number(r.score || 0),
      }))
      .filter((c) => Array.isArray(c.emb));
    const picked = mmrRerank(pool, qvec, takeK, 0.6).slice(
      (page - 1) * perPage,
      (page - 1) * perPage + perPage
    );

    const items = picked
      .map(({ raw, score }) => ({
        isbn: raw.isbn,
        title: raw.title,
        coverUrl: raw.coverUrl ?? undefined,
        summary: raw.summary ?? null,
        score: +Number(score).toFixed(3),
      }))
      .sort((a, b) => b.score - a.score);
    return res.json({
      items,
      total: await countAvailable(flex, childId),
      ageFlex: flex.pad,
    });
  } catch (e: any) {
    const payload: any = { error: "internal_error" };
    if (process.env.NODE_ENV !== "production") {
      payload.message = e?.message;
      payload.details = e?.meta ?? e?.stack ?? String(e);
    }
    return res.status(500).json(payload);
  }
};

/* ============================== Router ============================== */
const router = Router();
router.post("/recommendations/quiz", postQuiz);
router.get("/recommendations/profile", getProfile);
export default router;
