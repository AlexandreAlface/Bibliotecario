"use strict";
// apps/api/src/routes/recommendations.ts
// Autor: Alexandre Brissos 21131
// Objetivo: recomendações via quiz/perfil com handlers curtos, serviços e helpers puros.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../../prisma");
const embeddings_1 = require("../../ai/embeddings");
const utils_1 = require("../../reco/utils");
/* ============================== Schemas ============================== */
const QuizBodySchema = zod_1.default.object({
    answers: zod_1.default.array(zod_1.default.object({ id: zod_1.default.string(), value: zod_1.default.unknown() })).nonempty(),
});
/* ============================== Helpers PUROS ============================== */
const clampPerPage = (v) => Math.min(48, Math.max(6, Number.isFinite(Number(v)) ? Number(v) : 12));
const normPage = (v) => Math.max(1, Number.isFinite(Number(v)) ? Number(v) : 1);
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
        return arr.every(Number.isFinite) ? arr : null;
    }
    return null;
}
function yearsOld(dob) {
    if (!dob)
        return undefined;
    const d = new Date(dob), now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate()))
        y--;
    return Math.max(0, y);
}
const cosineSim = (a, b) => {
    let dot = 0, na = 0, nb = 0, L = Math.min(a.length, b.length);
    for (let i = 0; i < L; i++) {
        const x = Number(a[i] || 0), y = Number(b[i] || 0);
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
    return denom ? dot / denom : 0;
};
function mmrRerank(candidates, _query, k, lambda = 0.6) {
    const chosen = [];
    const pool = candidates.slice();
    while (chosen.length < Math.min(k, pool.length)) {
        let bestIdx = -1, bestVal = -Infinity;
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
const withPad = (minAge, maxAge, pad) => ({
    effMin: minAge == null ? null : Math.max(0, minAge - pad),
    effMax: maxAge == null ? null : maxAge + pad,
    pad,
});
function getAgeRangeFromAnswers(answers) {
    const ageRange = answers.find((a) => a.id === "age" || a.id === "ageRange")?.value;
    const m = typeof ageRange === "string" ? ageRange.match(/^(\d+)\s*-\s*(\d+)$/) : null;
    const min = m ? Number(m[1]) : null;
    const max = m ? Number(m[2]) : null;
    return {
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null,
    };
}
/* ============================== Serviços (DB) ============================== */
async function countAvailable(eff, childId) {
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT COUNT(*)::int AS total
    FROM "Book" b
    WHERE b."embedding" IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
      AND NOT EXISTS (
        -- excluir QUALQUER leitura do miúdo (terminada ou não)
        SELECT 1 FROM "Reading" r_any
        WHERE r_any."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND r_any."childId" = ${childId ?? null})
      )
      AND NOT EXISTS (
        -- excluir livros já avaliados pelo miúdo OU por alguém da família do miúdo
        SELECT 1
        FROM "Rating" rt
        WHERE rt."bookIsbn" = b."isbn"
          AND (
            (${childId ?? null}::int IS NOT NULL AND rt."childId" = ${childId ?? null})
            OR (${childId ?? null}::int IS NOT NULL AND EXISTS (
                 SELECT 1 FROM "ChildFamily" cf
                 WHERE cf."childId" = ${childId ?? null}
                   AND cf."familyId" = rt."userId"
            ))
          )
      )
      AND NOT EXISTS (
        -- reservas recentes também fora (30 dias)
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId ?? null})
          AND br."reservedAt" > now() - interval '30 days'
      )
  `;
    return rows?.[0]?.total ?? 0;
}
async function ensureAgeFlex(perPage, baseMin, baseMax, childId) {
    let pad = 0, eff = withPad(baseMin, baseMax, pad);
    let total = await countAvailable(eff, childId);
    while (total < perPage && pad < 2) {
        pad += 1;
        eff = withPad(baseMin, baseMax, pad);
        total = await countAvailable(eff, childId);
    }
    return { ...eff, pad };
}
async function fetchCandidatesByVector(v, eff, candidateCount, childId) {
    const vv = (0, utils_1.toSqlVector)(v);
    return prisma_1.prisma.$queryRaw `
    SELECT b."isbn", b."title", b."coverUrl", b."summary",
           1 - (b."embedding" <=> ${vv}::vector) AS score,
           b.embedding::text AS emb
    FROM "Book" b
    WHERE b."embedding" IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
      AND NOT EXISTS (
        -- excluir QUALQUER leitura do miúdo (terminada ou não)
        SELECT 1 FROM "Reading" r_any
        WHERE r_any."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND r_any."childId" = ${childId ?? null})
      )
      AND NOT EXISTS (
        -- excluir livros já avaliados pelo miúdo OU por alguém da família do miúdo
        SELECT 1
        FROM "Rating" rt
        WHERE rt."bookIsbn" = b."isbn"
          AND (
            (${childId ?? null}::int IS NOT NULL AND rt."childId" = ${childId ?? null})
            OR (${childId ?? null}::int IS NOT NULL AND EXISTS (
                 SELECT 1 FROM "ChildFamily" cf
                 WHERE cf."childId" = ${childId ?? null}
                   AND cf."familyId" = rt."userId"
            ))
          )
      )
      AND NOT EXISTS (
        -- reservas recentes também fora (30 dias)
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId ?? null})
          AND br."reservedAt" > now() - interval '30 days'
      )
    ORDER BY b."embedding" <=> ${vv}::vector
    LIMIT ${candidateCount};
  `;
}
async function fetchDeterministicPage(eff, perPage, page, childId) {
    const offset = (page - 1) * perPage;
    return prisma_1.prisma.$queryRaw `
    SELECT b."isbn", b."title", b."coverUrl", b."summary", 0.0 AS score
    FROM "Book" b
    WHERE b.embedding IS NOT NULL
      AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
      AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
      AND NOT EXISTS (
        -- excluir QUALQUER leitura do miúdo (terminada ou não)
        SELECT 1 FROM "Reading" r_any
        WHERE r_any."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND r_any."childId" = ${childId ?? null})
      )
      AND NOT EXISTS (
        -- excluir livros já avaliados pelo miúdo OU por alguém da família do miúdo
        SELECT 1
        FROM "Rating" rt
        WHERE rt."bookIsbn" = b."isbn"
          AND (
            (${childId ?? null}::int IS NOT NULL AND rt."childId" = ${childId ?? null})
            OR (${childId ?? null}::int IS NOT NULL AND EXISTS (
                 SELECT 1 FROM "ChildFamily" cf
                 WHERE cf."childId" = ${childId ?? null}
                   AND cf."familyId" = rt."userId"
            ))
          )
      )
      AND NOT EXISTS (
        -- reservas recentes também fora (30 dias)
        SELECT 1 FROM "BookReservation" br
        WHERE br."bookIsbn" = b."isbn"
          AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId ?? null})
          AND br."reservedAt" > now() - interval '30 days'
      )
    ORDER BY b."isbn" DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;
}
/* ---- Perfil da criança (vetor) ---- */
async function computeChildVector(childId) {
    const now = Date.now();
    const vecs = [];
    const w = [];
    const rated = await prisma_1.prisma.$queryRaw `
    SELECT b.embedding::text AS e, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL AND r."stars" >= 4
    ORDER BY r."ratedAt" DESC LIMIT 200;
  `;
    for (const r of rated) {
        const v = asNumArray(r.e);
        if (!v)
            continue;
        const ageDays = (now - new Date(r.ratedAt).getTime()) / 86400000;
        vecs.push(v);
        w.push(0.3 + 0.7 * ((r.stars - 3) / 2) * Math.exp(-ageDays / 90));
    }
    const reading = await prisma_1.prisma.$queryRaw `
    SELECT b.embedding::text AS e, COALESCE(r."startedAt", now()) AS t
    FROM "Reading" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND r."finishedAt" IS NULL AND b.embedding IS NOT NULL
    LIMIT 100;
  `;
    for (const r of reading) {
        const v = asNumArray(r.e);
        if (!v)
            continue;
        const ageDays = (now - new Date(r.t).getTime()) / 86400000;
        vecs.push(v);
        w.push(0.2 + 0.15 * Math.exp(-ageDays / 60));
    }
    const reserved = await prisma_1.prisma.$queryRaw `
    SELECT b.embedding::text AS e, br."reservedAt" AS t
    FROM "BookReservation" br
    JOIN "Book" b ON b."isbn" = br."bookIsbn"
    WHERE br."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY br."reservedAt" DESC LIMIT 50;
  `;
    for (const r of reserved) {
        const v = asNumArray(r.e);
        if (!v)
            continue;
        const ageDays = (now - new Date(r.t).getTime()) / 86400000;
        vecs.push(v);
        w.push(0.1 + 0.15 * Math.exp(-ageDays / 45));
    }
    const centroid = (0, utils_1.weightedCentroid)(vecs, w);
    if (!centroid)
        return null;
    await prisma_1.prisma.$executeRaw `
    INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
    VALUES (${childId}, ${"AUTO (ratings+reading+reservas)"}, ${(0, utils_1.toSqlVector)(centroid)}::vector, now())
    ON CONFLICT ("childId") DO UPDATE
      SET "profileText" = EXCLUDED."profileText",
          "embedding"   = EXCLUDED."embedding",
          "updatedAt"   = now();
  `;
    return centroid;
}
/* ============================== Handlers (<= 30 linhas) ============================== */
/** POST /recommendations/quiz */
const postQuiz = async (req, res) => {
    const parse = QuizBodySchema.safeParse(req.body);
    if (!parse.success)
        return res
            .status(400)
            .json({ error: "bad_body", details: parse.error.issues });
    const answers = parse.data.answers;
    const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
    const page = normPage(req.query.page);
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    try {
        const profile = (0, utils_1.buildProfileText)(answers);
        const qvec = await (0, embeddings_1.embedOne)(profile);
        const { min, max } = getAgeRangeFromAnswers(answers);
        const flex = await ensureAgeFlex(perPage, min, max, childId);
        const takeK = page * perPage;
        const candidates = Math.max(64, Math.min(400, takeK * 8));
        const rows = await fetchCandidatesByVector(qvec, flex, candidates, childId);
        const pool = rows
            .map((r) => ({
            raw: r,
            emb: asNumArray(r.emb),
            score: Number(r.score || 0),
        }))
            .filter((c) => Array.isArray(c.emb));
        const picked = mmrRerank(pool, qvec, takeK, 0.6).slice((page - 1) * perPage, (page - 1) * perPage + perPage);
        const items = picked
            .map(({ raw, score }) => ({
            isbn: raw.isbn,
            title: raw.title,
            coverUrl: raw.coverUrl ?? undefined,
            summary: raw.summary ?? null,
            score: +Number(score).toFixed(3),
            why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(Boolean),
        }))
            .sort((a, b) => b.score - a.score);
        return res.json({
            items,
            total: await countAvailable(flex, childId),
            ageFlex: flex.pad,
        });
    }
    catch (e) {
        const payload = { error: "internal_error" };
        if (process.env.NODE_ENV !== "production") {
            payload.message = e?.message;
            payload.details = e?.meta ?? e?.stack ?? String(e);
        }
        return res.status(500).json(payload);
    }
};
/** GET /recommendations/profile */
const getProfile = async (req, res) => {
    const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
    const page = normPage(req.query.page);
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    try {
        let qvec = null, minAge = null, maxAge = null;
        if (childId) {
            const child = await prisma_1.prisma.child.findUnique({
                where: { id: childId },
                select: { birthDate: true },
            });
            const age = yearsOld(child?.birthDate);
            if (Number.isFinite(age)) {
                minAge = age;
                maxAge = age;
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
        const takeK = page * perPage, candidates = Math.max(64, Math.min(400, takeK * 8));
        const rows = await fetchCandidatesByVector(qvec, flex, candidates, childId);
        const pool = rows
            .map((r) => ({
            raw: r,
            emb: asNumArray(r.emb),
            score: Number(r.score || 0),
        }))
            .filter((c) => Array.isArray(c.emb));
        const picked = mmrRerank(pool, qvec, takeK, 0.6).slice((page - 1) * perPage, (page - 1) * perPage + perPage);
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
    }
    catch (e) {
        const payload = { error: "internal_error" };
        if (process.env.NODE_ENV !== "production") {
            payload.message = e?.message;
            payload.details = e?.meta ?? e?.stack ?? String(e);
        }
        return res.status(500).json(payload);
    }
};
/* ============================== Router ============================== */
const router = (0, express_1.Router)();
router.post("/recommendations/quiz", postQuiz);
router.get("/recommendations/profile", getProfile);
exports.default = router;
