"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/reco.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../prisma");
const _helpers_1 = require("./_helpers");
const QuerySchema = zod_1.default.object({
    childId: zod_1.default.string().optional(),
    familyId: zod_1.default.string().optional(),
    limit: zod_1.default.string().optional(),
    excludeOpen: zod_1.default.string().optional(),
});
function parseRecoQuery(q) {
    const s = QuerySchema.parse(q);
    const limit = Math.min(Number(s.limit ?? 12), 50);
    return {
        childId: s.childId ? Number(s.childId) : undefined,
        familyId: s.familyId ? Number(s.familyId) : undefined,
        limit: Number.isFinite(limit) ? limit : 12,
        excludeOpen: s.excludeOpen === "1",
    };
}
function mapStatus(r) {
    if (Number(r.hasOpenReading || 0) > 0)
        return "reading";
    if (Number(r.hasOpenReservation || 0) > 0)
        return "reserved";
    if (r.lastFinished)
        return "finished";
    return "none";
}
function toItem(r) {
    return {
        isbn: r.isbn,
        title: r.title,
        coverUrl: r.coverUrl ?? null,
        status: mapStatus(r),
        lastFinished: r.lastFinished ?? null,
    };
}
async function fetchRecoProfile(cid, limit, excludeOpen) {
    const excludeOpenClause = excludeOpen
        ? client_1.Prisma.sql `AND COALESCE(h."hasOpenReading",0)=0 AND COALESCE(h."hasOpenReservation",0)=0`
        : client_1.Prisma.empty;
    const rows = await prisma_1.prisma.$queryRaw `
    WITH hist AS (
      SELECT
        b."isbn",
        MAX(r."finishedAt") FILTER (WHERE r."finishedAt" IS NOT NULL) AS "lastFinished",
        COUNT(DISTINCT br."id") AS "resCount",
        COUNT(*) FILTER (WHERE r."finishedAt" IS NOT NULL) AS "readCount",
        MAX(rt."ratedAt") AS "lastRatedAt",
        (ARRAY_REMOVE(ARRAY_AGG(rt."stars" ORDER BY rt."ratedAt" DESC), NULL))[1] AS "lastStars",
        MAX(CASE WHEN ro."id"  IS NOT NULL THEN 1 ELSE 0 END) AS "hasOpenReading",
        MAX(CASE WHEN bro."id" IS NOT NULL THEN 1 ELSE 0 END) AS "hasOpenReservation"
      FROM "Book" b
      LEFT JOIN "BookReservation" br ON br."bookIsbn" = b."isbn" AND br."childId" = ${cid}
      LEFT JOIN "Reading" r          ON r."bookIsbn"  = b."isbn" AND r."childId" = ${cid}
      LEFT JOIN "Rating" rt          ON rt."bookIsbn" = b."isbn" AND rt."childId" = ${cid}
      LEFT JOIN LATERAL (
        SELECT r2."id" FROM "Reading" r2
        WHERE r2."childId"=${cid} AND r2."bookIsbn"=b."isbn" AND r2."finishedAt" IS NULL
        ORDER BY r2."id" DESC LIMIT 1
      ) ro  ON TRUE
      LEFT JOIN LATERAL (
        SELECT br2."id" FROM "BookReservation" br2
        WHERE br2."childId"=${cid} AND br2."bookIsbn"=b."isbn"
          AND NOT EXISTS (SELECT 1 FROM "Reading" rx WHERE rx."reservationId" = br2."id")
        ORDER BY br2."reservedAt" DESC LIMIT 1
      ) bro ON TRUE
      GROUP BY b."isbn"
    )
    SELECT
      b."isbn", b."title", b."coverUrl",
      GREATEST(0, 1 - (b.embedding <=> cp.embedding)) AS base_sim,
      h."lastFinished", h."resCount", h."readCount", h."lastStars",
      h."hasOpenReading", h."hasOpenReservation",
      CASE
        WHEN h."lastFinished" IS NULL THEN 1.0
        WHEN h."lastFinished" > now() - interval '30 days' THEN 0.7
        WHEN h."lastFinished" > now() - interval '90 days' THEN 0.9
        ELSE 1.0
      END AS recency_factor,
      (1.0 + LEAST(0.20, 0.05 * h."resCount") + LEAST(0.30, 0.07 * h."readCount")) AS repeat_bonus,
      (1.0 + COALESCE(GREATEST(0, (h."lastStars" - 3)) * 0.03, 0)) AS rating_bonus
    FROM "Book" b
    JOIN "ChildPreference" cp ON cp."childId" = ${cid}
    LEFT JOIN hist h ON h."isbn" = b."isbn"
    WHERE b.embedding IS NOT NULL
      ${excludeOpenClause}
    ORDER BY (GREATEST(0, 1 - (b.embedding <=> cp.embedding)))
             * COALESCE((
                 CASE
                   WHEN h."lastFinished" IS NULL THEN 1.0
                   WHEN h."lastFinished" > now() - interval '30 days' THEN 0.7
                   WHEN h."lastFinished" > now() - interval '90 days' THEN 0.9
                   ELSE 1.0
                 END
               ),1)
             * COALESCE((1.0 + LEAST(0.20, 0.05 * h."resCount") + LEAST(0.30, 0.07 * h."readCount")),1)
             * COALESCE((1.0 + GREATEST(0, (h."lastStars" - 3)) * 0.03),1) DESC
    LIMIT ${limit};
  `;
    return rows.map(toItem);
}
const getProfileHandler = async (req, res) => {
    try {
        const q = parseRecoQuery(req.query);
        const cid = await (0, _helpers_1.resolveChildId)({
            prisma: prisma_1.prisma,
            childId: q.childId,
            familyId: q.familyId,
        });
        if (!cid) {
            res.status(400).json({ error: "missing_child" });
            return;
        }
        // ⚠️ Campos Unsupported (vector) não podem ser selecionados no Prisma Client.
        // Basta verificar se existe uma linha para este childId.
        const cpExists = await prisma_1.prisma.childPreference.findUnique({
            where: { childId: cid },
            select: { childId: true },
        });
        if (!cpExists) {
            res.json([]);
            return;
        }
        const items = await fetchRecoProfile(cid, q.limit, q.excludeOpen);
        res.json(items);
    }
    catch (e) {
        console.error("GET /api/reco/profile", e);
        res.status(500).json({ error: "internal_error" });
    }
};
const router = (0, express_1.Router)();
router.get("/profile", getProfileHandler);
exports.default = router;
