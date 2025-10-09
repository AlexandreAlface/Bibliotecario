"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = getUserId;
exports.asNumArray = asNumArray;
exports.weightedCentroid = weightedCentroid;
exports.statusFromRow = statusFromRow;
exports.fetchPending = fetchPending;
exports.fetchRatingVectors = fetchRatingVectors;
exports.centroidFromRows = centroidFromRows;
exports.blendCommentsEmbedding = blendCommentsEmbedding;
exports.saveChildPreference = saveChildPreference;
exports.recomputeChildPreferenceFromRatings = recomputeChildPreferenceFromRatings;
exports.upsertRatingForUser = upsertRatingForUser;
// apps/api/src/routes/ratings.ts
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../../prisma");
const _helpers_1 = require("./_helpers");
const utils_1 = require("../../reco/utils");
const embeddings_1 = require("../../ai/embeddings");
const router = (0, express_1.Router)();
const CreateRatingSchema = zod_1.default.object({
    isbn: zod_1.default.string().min(5),
    stars: zod_1.default.number().min(1).max(5),
    comment: zod_1.default.string().optional(),
    childId: zod_1.default.number().optional(),
    familyId: zod_1.default.number().optional(),
});
/* ---------- Helpers puros ---------- */
function getUserId(req) {
    const fromUser = Number(req.user?.id ?? req.user?.sub);
    const fromSess = Number(req.session?.userId);
    const fromHdr = Number(req.headers["x-user-id"]);
    const fromQry = Number(req.query?.userId);
    return [fromUser, fromSess, fromHdr, fromQry].find(Number.isFinite) ?? null;
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
function weightedCentroid(vecs, wts) {
    let sumW = 0;
    let acc = null;
    for (let i = 0; i < vecs.length; i++) {
        const v = vecs[i];
        const w = Math.max(0, Number(wts[i] || 0));
        if (!v?.length || !Number.isFinite(w) || w === 0)
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
function statusFromRow(r) {
    return r.finishedAt ? "finished" : r.startedAt ? "reading" : "reserved";
}
/* ---------- Services ---------- */
async function fetchPending(pr, cid, userId, limit) {
    const rows = await pr.$queryRaw `
    WITH pending AS (
      SELECT br.id AS "reservationId", br."reservedAt", b."isbn", b."title", b."coverUrl",
             rr."id" AS "readingId", rr."startedAt", rr."finishedAt",
             ur."stars", ur."comment", ur."ratedAt",
             br."reservedAt" AS "sortDate"
      FROM "BookReservation" br
      JOIN "Book" b ON b."isbn" = br."bookIsbn"
      LEFT JOIN LATERAL (
        SELECT r2."id", r2."startedAt", r2."finishedAt"
        FROM "Reading" r2
        WHERE r2."reservationId" = br."id" AND r2."finishedAt" IS NULL
        ORDER BY r2."id" DESC LIMIT 1
      ) rr ON TRUE
      LEFT JOIN LATERAL (
        SELECT rt."stars", rt."comment", rt."ratedAt"
        FROM "Rating" rt
        WHERE rt."userId" = ${userId} AND rt."childId" = ${cid} AND rt."bookIsbn" = br."bookIsbn"
        ORDER BY rt."ratedAt" DESC LIMIT 1
      ) ur ON TRUE
      WHERE br."childId" = ${cid}
    ),
    finished AS (
      SELECT NULL::int AS "reservationId", NULL::timestamp AS "reservedAt",
             b."isbn", b."title", b."coverUrl",
             r."id" AS "readingId", r."startedAt", r."finishedAt",
             ur."stars", ur."comment", ur."ratedAt",
             r."finishedAt" AS "sortDate"
      FROM (
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
        WHERE rt."userId" = ${userId} AND rt."childId" = ${cid} AND rt."bookIsbn" = r."bookIsbn"
        ORDER BY rt."ratedAt" DESC LIMIT 1
      ) ur ON TRUE
    )
    SELECT * FROM pending
    UNION ALL
    SELECT * FROM finished
    ORDER BY "sortDate" DESC NULLS LAST
    LIMIT ${limit};
  `;
    return rows.map((r) => ({
        reservationId: r.reservationId ?? null,
        isbn: r.isbn,
        title: r.title,
        coverUrl: r.coverUrl ?? null,
        status: statusFromRow(r),
        startedAt: r.startedAt ?? null,
        finishedAt: r.finishedAt ?? null,
        stars: r.stars != null ? Number(r.stars) : null,
        comment: r.comment ?? null,
        ratedAt: r.ratedAt ?? null,
        readingId: r.readingId ?? null,
    }));
}
async function fetchRatingVectors(pr, childId) {
    return pr.$queryRaw `
    SELECT b.embedding::text AS embedding, r."stars", r."ratedAt",
           rc.read_count::int  AS "readCount",
           res.res_count::int  AS "resCount",
           rc.last_finished    AS "lastFinished"
    FROM "Rating" r
    JOIN "Book" b ON b."isbn" = r."bookIsbn"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS read_count, MAX("finishedAt") AS last_finished
      FROM "Reading" rr
      WHERE rr."childId" = r."childId" AND rr."bookIsbn" = r."bookIsbn" AND rr."finishedAt" IS NOT NULL
    ) rc ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS res_count
      FROM "BookReservation" br
      WHERE br."childId" = r."childId" AND br."bookIsbn" = r."bookIsbn"
    ) res ON TRUE
    WHERE r."childId" = ${childId} AND b.embedding IS NOT NULL
    ORDER BY r."ratedAt" DESC
    LIMIT 200;
  `;
}
function centroidFromRows(rows) {
    const now = Date.now();
    const vecs = [];
    const wts = [];
    for (const r of rows) {
        const v = asNumArray(r.embedding);
        if (!v)
            continue;
        const stars = Number(r.stars || 0);
        const ageDays = Math.max(0, (now - new Date(r.ratedAt).getTime()) / 86400000);
        const recencyRating = Math.exp(-ageDays / 180);
        const lastFinished = r.lastFinished
            ? new Date(r.lastFinished).getTime()
            : null;
        const daysFinished = lastFinished
            ? Math.max(0, (now - lastFinished) / 86400000)
            : null;
        const recencyFinished = daysFinished != null ? Math.exp(-daysFinished / 120) : 1.0;
        const starGain = Math.max(0, Math.min(1, (stars - 2) / 3));
        const resBonus = 1.0 + Math.min(0.25, 0.05 * Math.max(0, r.resCount || 0));
        const readBonus = 1.0 + Math.min(0.35, 0.08 * Math.max(0, r.readCount || 0));
        const w = (0.2 + starGain) * recencyRating * recencyFinished * resBonus * readBonus;
        if (w > 0) {
            vecs.push(v);
            wts.push(w);
        }
    }
    return weightedCentroid(vecs, wts);
}
async function blendCommentsEmbedding(pr, childId, centroid) {
    const comm = await pr.rating.findMany({
        where: { childId, stars: { gte: 4 }, comment: { not: null } },
        select: { comment: true },
        orderBy: { ratedAt: "desc" },
        take: 20,
    });
    if (!comm.length)
        return centroid;
    try {
        const text = comm
            .map((c) => c.comment)
            .filter(Boolean)
            .join("\n");
        const textVec = await (0, embeddings_1.embedOne)(`Comentários de livros de que gostei: ${text}`);
        const L = Math.min(centroid.length, textVec.length);
        const out = centroid.slice();
        const alpha = 0.2;
        for (let i = 0; i < L; i++)
            out[i] = out[i] * (1 - alpha) + textVec[i] * alpha;
        return out;
    }
    catch {
        return centroid;
    }
}
async function saveChildPreference(pr, childId, vec) {
    const v = (0, utils_1.toSqlVector)(vec);
    await pr.$executeRaw `
    INSERT INTO "ChildPreference" ("childId","profileText","embedding","updatedAt")
    VALUES (${childId}, ${"Gerado a partir de ratings + comentários"}, ${v}::vector, now())
    ON CONFLICT ("childId")
    DO UPDATE SET "profileText" = EXCLUDED."profileText", "embedding" = EXCLUDED."embedding", "updatedAt" = now();
  `;
    return true;
}
async function recomputeChildPreferenceFromRatings(pr, childId) {
    const rows = await fetchRatingVectors(pr, childId);
    if (!rows.length)
        return false;
    const base = centroidFromRows(rows);
    if (!base)
        return false;
    const mixed = await blendCommentsEmbedding(pr, childId, base);
    return saveChildPreference(pr, childId, mixed);
}
async function upsertRatingForUser(pr, userId, childId, isbn, stars, comment) {
    return pr.$transaction(async (tx) => {
        const existing = await tx.rating.findFirst({
            where: { userId, childId, bookIsbn: isbn },
            select: { id: true, readingId: true },
            orderBy: { ratedAt: "desc" },
        });
        const finished = await tx.reading.findFirst({
            where: { childId, bookIsbn: isbn, finishedAt: { not: null } },
            select: { id: true },
            orderBy: { id: "desc" },
        });
        if (existing) {
            return tx.rating.update({
                where: { id: existing.id },
                data: {
                    stars,
                    comment: comment ?? null,
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
        if (!finished) {
            const err = new Error("reading_not_finished");
            err.code = "reading_not_finished";
            throw err;
        }
        return tx.rating.create({
            data: {
                userId,
                childId,
                readingId: finished.id,
                bookIsbn: isbn,
                stars,
                comment: comment ?? null,
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
}
/* ---------- Routes (RequestHandler + sem devolver Response) ---------- */
// GET /api/ratings/pending
const getPendingHandler = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const childId = req.query.childId ? Number(req.query.childId) : undefined;
        const familyId = req.query.familyId
            ? Number(req.query.familyId)
            : undefined;
        const cid = await (0, _helpers_1.resolveChildId)({ prisma: prisma_1.prisma, childId, familyId });
        if (!cid) {
            res.status(400).json({ error: "missing_child" });
            return;
        }
        const userId = getUserId(req);
        const items = await fetchPending(prisma_1.prisma, cid, userId, limit);
        res.json(items);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
};
// POST /api/ratings
const postRatingHandler = async (req, res) => {
    try {
        const body = CreateRatingSchema.parse(req.body);
        let userId = getUserId(req);
        const familyIdInline = typeof body.familyId === "number"
            ? body.familyId
            : req.query.familyId
                ? Number(req.query.familyId)
                : undefined;
        if (!userId && familyIdInline)
            userId = familyIdInline;
        if (!userId) {
            res.status(401).json({ error: "unauthenticated" });
            return;
        }
        const cid = await (0, _helpers_1.resolveChildId)({
            prisma: prisma_1.prisma,
            childId: body.childId,
            familyId: familyIdInline,
        });
        if (!cid) {
            res.status(400).json({ error: "missing_child" });
            return;
        }
        const rating = await upsertRatingForUser(prisma_1.prisma, userId, cid, body.isbn, body.stars, body.comment);
        await recomputeChildPreferenceFromRatings(prisma_1.prisma, cid);
        res.json({ ok: true, rating });
    }
    catch (e) {
        console.error(e);
        if (e?.code === "reading_not_finished" ||
            e?.message === "reading_not_finished") {
            res.status(400).json({ error: "reading_not_finished" });
            return;
        }
        res.status(500).json({ error: "internal_error" });
    }
};
router.get("/pending", getPendingHandler);
router.post("/", postRatingHandler);
exports.default = router;
