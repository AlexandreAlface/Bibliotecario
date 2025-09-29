"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const embeddings_js_1 = require("../ai/embeddings.js");
const utils_js_1 = require("../reco/utils.js");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const QuizBodySchema = zod_1.default.object({
    answers: zod_1.default.array(zod_1.default.object({ id: zod_1.default.string(), value: zod_1.default.unknown() })).nonempty(),
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
    if (!vecs?.length)
        return null;
    const n = vecs.length;
    const acc = Array.from(vecs[0], () => 0);
    for (const v of vecs)
        for (let i = 0; i < acc.length; i++)
            acc[i] += Number(v[i] || 0);
    for (let i = 0; i < acc.length; i++)
        acc[i] /= n;
    return acc;
}
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
function yearsOld(dob) {
    if (!dob)
        return undefined;
    const d = new Date(dob);
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate()))
        y--;
    return Math.max(0, y);
}
/* ===== Similaridade e MMR ===== */
function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    const L = Math.min(a.length, b.length);
    for (let i = 0; i < L; i++) {
        const x = Number(a[i] || 0), y = Number(b[i] || 0);
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
    return denom ? dot / denom : 0;
}
function mmrRerank(candidates, _query, k, lambda = 0.6) {
    const chosen = [];
    const pool = candidates.slice();
    while (chosen.length < Math.min(k, pool.length)) {
        let bestIdx = -1, bestVal = -Infinity;
        for (let i = 0; i < pool.length; i++) {
            const c = pool[i];
            const simToQuery = c.score; // já é cos-sim com a query
            let maxToChosen = 0;
            for (const s of chosen) {
                const sim = cosineSim(c.emb, s.emb);
                if (sim > maxToChosen)
                    maxToChosen = sim;
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
/** Vetor do perfil (ratings 4–5★, leituras, reservas) + cache */
async function computeChildVector(childId) {
    const now = Date.now();
    const vecs = [];
    const weights = [];
    const rated = await prisma.$queryRaw `
    SELECT b.embedding::text AS e, r."stars", r."ratedAt"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL AND r."stars" >= 4
    ORDER BY r."ratedAt" DESC
    LIMIT 200;
  `;
    for (const r of rated) {
        const v = asNumArray(r.e);
        if (!v)
            continue;
        const stars = Number(r.stars || 0);
        const ageDays = (now - new Date(r.ratedAt).getTime()) / 86400000;
        const recency = Math.exp(-ageDays / 90);
        const gusto = (stars - 3) / 2;
        vecs.push(v);
        weights.push(0.3 + 0.7 * gusto * recency);
    }
    const reading = await prisma.$queryRaw `
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
        const recency = Math.exp(-ageDays / 60);
        vecs.push(v);
        weights.push(0.2 + 0.15 * recency);
    }
    const reserved = await prisma.$queryRaw `
    SELECT b.embedding::text AS e, br."reservedAt" AS t
    FROM "BookReservation" br
    JOIN "Book" b ON b."isbn" = br."bookIsbn"
    WHERE br."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY br."reservedAt" DESC
    LIMIT 50;
  `;
    for (const r of reserved) {
        const v = asNumArray(r.e);
        if (!v)
            continue;
        const ageDays = (now - new Date(r.t).getTime()) / 86400000;
        const recency = Math.exp(-ageDays / 45);
        vecs.push(v);
        weights.push(0.1 + 0.15 * recency);
    }
    let centroid = (0, utils_js_1.weightedCentroid)(vecs, weights);
    if (!centroid) {
        const child = await prisma.child.findUnique({
            where: { id: childId },
            select: { birthDate: true },
        });
        const age = yearsOld(child?.birthDate);
        const rows = await prisma.$queryRaw `
      SELECT b.embedding::text AS e
      FROM "Book" b
      WHERE b.embedding IS NOT NULL
        AND (${age ?? null}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${age ?? null}::int)
        AND (${age ?? null}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${age ?? null}::int)
      LIMIT 200;
    `;
        const vks = rows.map((r) => asNumArray(r.e)).filter(Boolean);
        if (vks.length) {
            const d = vks[0].length;
            centroid = Array.from({ length: d }, (_, j) => vks.reduce((s, v) => s + v[j], 0) / vks.length);
        }
    }
    if (!centroid)
        return null;
    try {
        await prisma.$executeRaw `
      INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
      VALUES (${childId}, ${"AUTO (ratings+reading+reservas)"}, ${(0, utils_js_1.toSqlVector)(centroid)}::vector, now())
      ON CONFLICT ("childId") DO UPDATE
        SET "profileText" = EXCLUDED."profileText",
            "embedding"   = EXCLUDED."embedding",
            "updatedAt"   = now();
    `;
    }
    catch { }
    return centroid;
}
/* ====== Helpers de Age Flex ====== */
function withPad(minAge, maxAge, pad) {
    const lo = minAge == null ? null : Math.max(0, Number(minAge) - pad);
    const hi = maxAge == null ? null : Number(maxAge) + pad;
    return { effMin: lo, effMax: hi };
}
/* ===========================================
   POST /recommendations/quiz
=========================================== */
router.post("/recommendations/quiz", async (req, res) => {
    let body;
    try {
        body = QuizBodySchema.parse(req.body);
    }
    catch (e) {
        return res.status(400).json({ error: "bad_body", details: e.errors });
    }
    const answers = body.answers;
    const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
    const page = normPage(req.query.page);
    const offset = (page - 1) * perPage;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    try {
        const profile = (0, utils_js_1.buildProfileText)(answers);
        const qvec = await (0, embeddings_js_1.embedOne)(profile);
        const v = (0, utils_js_1.toSqlVector)(qvec);
        // idade do quiz
        const ageRange = answers.find((a) => a.id === "age" || a.id === "ageRange")?.value;
        let min, max;
        const m = typeof ageRange === "string"
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
        let totalRows = await prisma.$queryRaw `
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
        AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        );
    `;
        while ((totalRows?.[0]?.total ?? 0) < perPage && pad < 2) {
            pad += 1;
            eff = withPad(baseMin, baseMax, pad);
            totalRows = await prisma.$queryRaw `
        SELECT COUNT(*)::int AS total
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
          AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          );
      `;
        }
        const candidateCount = Math.max(64, Math.min(400, Number(perPage) * 8));
        const rows = await prisma.$queryRaw `
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score,
             b.embedding::text AS emb
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
        AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${candidateCount} OFFSET ${offset};
    `;
        let candidates = rows
            .map((r) => ({
            raw: r,
            emb: asNumArray(r.emb),
            score: Number(r.score ?? 0),
        }))
            .filter((c) => Array.isArray(c.emb));
        let picked = candidates.length >= Number(perPage)
            ? mmrRerank(candidates, qvec, Number(perPage), 0.6)
            : rows
                .slice(0, Number(perPage))
                .map((raw) => ({ raw, emb: [], score: Number(raw.score ?? 0) }));
        if (picked.length < Number(perPage)) {
            const missing = Number(perPage) - picked.length;
            const excludeIsbns = picked.map((p) => p.raw.isbn);
            const extra = await prisma.$queryRaw `
        SELECT b."isbn", b."title", b."coverUrl", b."summary",
               1 - (b."embedding" <=> ${v}::vector) AS score
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
          AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND (${excludeIsbns.length} = 0 OR b."isbn" <> ALL(${excludeIsbns}::text[]))
        ORDER BY b."embedding" <=> ${v}::vector
        LIMIT ${missing};
      `;
            picked = picked.concat(extra.map((raw) => ({ raw, emb: [], score: Number(raw.score ?? 0) })));
        }
        const items = picked.map(({ raw, score }) => ({
            isbn: raw.isbn,
            title: raw.title,
            coverUrl: raw.coverUrl ?? undefined,
            summary: raw.summary ?? null,
            score: Number(score.toFixed(3)),
            why: [profile.replace(/^Perfil do quiz:\s*/, "").trim()].filter(Boolean),
        }));
        res.json({
            items,
            total: totalRows?.[0]?.total ?? items.length,
            ageFlex: pad,
        });
    }
    catch (e) {
        console.error(e);
        const payload = { error: "internal_error" };
        if (process.env.NODE_ENV !== "production") {
            payload.message = e?.message;
            payload.details = e?.meta ?? e?.stack ?? String(e);
        }
        res.status(500).json(payload);
    }
});
/* ===========================================
   GET /recommendations/profile
=========================================== */
router.get("/recommendations/profile", async (req, res) => {
    const perPage = clampPerPage(req.query.perPage ?? req.query.limit);
    const page = normPage(req.query.page);
    const offset = (page - 1) * perPage;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
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
            queryVec = await computeChildVector(childId);
        }
        const baseMin = Number.isFinite(minAge) ? Number(minAge) : null;
        const baseMax = Number.isFinite(maxAge) ? Number(maxAge) : null;
        // AGE FLEX automático (0 → ±1 → ±2)
        let pad = 0;
        let eff = withPad(baseMin, baseMax, pad);
        let totalRows = await prisma.$queryRaw `
      SELECT COUNT(*)::int AS total
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
        AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        );
    `;
        while ((totalRows?.[0]?.total ?? 0) < perPage && pad < 2) {
            pad += 1;
            eff = withPad(baseMin, baseMax, pad);
            totalRows = await prisma.$queryRaw `
        SELECT COUNT(*)::int AS total
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
          AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          );
      `;
        }
        // Sem vetor → “recentes” com exclusões leves
        if (!queryVec) {
            const rows = await prisma.$queryRaw `
        SELECT b."isbn", b."title", b."coverUrl", b."summary", 0.0 AS score
        FROM "Book" b
        WHERE b.embedding IS NOT NULL
          AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
          AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND NOT EXISTS (
            SELECT 1 FROM "BookReservation" br
            WHERE br."bookIsbn" = b."isbn"
              AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
              AND br."reservedAt" > now() - interval '30 days'
          )
        ORDER BY b."isbn" DESC
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
                ageFlex: pad,
            });
        }
        // Vetorial + MMR (com effMin/effMax)
        const v = (0, utils_js_1.toSqlVector)(queryVec);
        const candidateCount = Math.max(64, Math.min(400, Number(perPage) * 8));
        const rows = await prisma.$queryRaw `
      SELECT b."isbn", b."title", b."coverUrl", b."summary",
             1 - (b."embedding" <=> ${v}::vector) AS score,
             b.embedding::text AS emb
      FROM "Book" b
      WHERE b."embedding" IS NOT NULL
        AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
        AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
        AND NOT EXISTS (
          SELECT 1 FROM "Reading" rblock
          WHERE rblock."bookIsbn" = b."isbn"
            AND rblock."finishedAt" IS NULL
            AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BookReservation" br
          WHERE br."bookIsbn" = b."isbn"
            AND (${childId ?? null}::int IS NOT NULL AND br."childId" = ${childId})
            AND br."reservedAt" > now() - interval '30 days'
        )
      ORDER BY b."embedding" <=> ${v}::vector
      LIMIT ${candidateCount} OFFSET ${offset};
    `;
        let candidates = rows
            .map((r) => ({
            raw: r,
            emb: asNumArray(r.emb),
            score: Number(r.score ?? 0),
        }))
            .filter((c) => Array.isArray(c.emb));
        let picked = candidates.length >= Number(perPage)
            ? mmrRerank(candidates, queryVec, Number(perPage), 0.6)
            : rows
                .slice(0, Number(perPage))
                .map((raw) => ({ raw, emb: [], score: Number(raw.score ?? 0) }));
        if (picked.length < Number(perPage)) {
            const missing = Number(perPage) - picked.length;
            const excludeIsbns = picked.map((p) => p.raw.isbn);
            const extra = await prisma.$queryRaw `
        SELECT b."isbn", b."title", b."coverUrl", b."summary",
               1 - (b."embedding" <=> ${v}::vector) AS score
        FROM "Book" b
        WHERE b."embedding" IS NOT NULL
          AND (${eff.effMin}::int IS NULL OR b."ageMin" IS NULL OR b."ageMin" <= ${eff.effMax}::int)
          AND (${eff.effMax}::int IS NULL OR b."ageMax" IS NULL OR b."ageMax" >= ${eff.effMin}::int)
          AND NOT EXISTS (
            SELECT 1 FROM "Reading" rblock
            WHERE rblock."bookIsbn" = b."isbn"
              AND rblock."finishedAt" IS NULL
              AND (${childId ?? null}::int IS NOT NULL AND rblock."childId" = ${childId})
          )
          AND (${excludeIsbns.length} = 0 OR b."isbn" <> ALL(${excludeIsbns}::text[]))
        ORDER BY b."embedding" <=> ${v}::vector
        LIMIT ${missing};
      `;
            picked = picked.concat(extra.map((raw) => ({ raw, emb: [], score: Number(raw.score ?? 0) })));
        }
        const items = picked.map(({ raw, score }) => ({
            isbn: raw.isbn,
            title: raw.title,
            coverUrl: raw.coverUrl ?? undefined,
            summary: raw.summary ?? null,
            score: Number((score ?? 0).toFixed(3)),
            why: [],
        }));
        res.json({
            items,
            total: totalRows?.[0]?.total ?? items.length,
            ageFlex: pad,
        });
    }
    catch (e) {
        console.error(e);
        const payload = { error: "internal_error" };
        if (process.env.NODE_ENV !== "production") {
            payload.message = e?.message;
            payload.details = e?.meta ?? e?.stack ?? String(e);
        }
        res.status(500).json(payload);
    }
});
exports.default = router;
