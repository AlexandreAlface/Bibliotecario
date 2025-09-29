"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/reco.js
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const _helpers_js_1 = require("./_helpers.js");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * GET /api/reco/profile?childId=&familyId=&limit=12&excludeOpen=1
 * - NÃO exclui lidos; só baixa ranking por recência
 * - devolve status por livro (reserved|reading|finished|none)
 */
router.get("/profile", async (req, res) => {
    const q = zod_1.default.object({
        childId: zod_1.default.string().optional(),
        familyId: zod_1.default.string().optional(),
        limit: zod_1.default.string().optional(),
        excludeOpen: zod_1.default.string().optional(), // "1" para não trazer reservados/a-ler
    }).parse(req.query);
    const limit = Math.min(Number(q.limit ?? 12), 50);
    const childId = q.childId ? Number(q.childId) : undefined;
    const familyId = q.familyId ? Number(q.familyId) : undefined;
    const excludeOpen = q.excludeOpen === "1";
    try {
        const cid = await (0, _helpers_js_1.resolveChildId)({ prisma, childId, familyId });
        if (!cid)
            return res.status(400).json({ error: "missing_child" });
        // precisa do embedding do perfil da criança
        const cp = await prisma.childPreference.findUnique({
            where: { childId: cid },
            select: { embedding: true },
        });
        if (!cp?.embedding)
            return res.json([]); // ainda sem perfil → devolver vazio ou fallback
        // SQL “repeat-aware”
        const rows = await prisma.$queryRaw `
      WITH hist AS (
        SELECT
          b."isbn",
          -- último estado
          MAX(r."finishedAt") FILTER (WHERE r."finishedAt" IS NOT NULL) AS "lastFinished",
          -- contagens por afinidade
          COUNT(DISTINCT br."id") AS "resCount",
          COUNT(*) FILTER (WHERE r."finishedAt" IS NOT NULL) AS "readCount",
          -- última avaliação (estrelas)
          MAX(rt."ratedAt") AS "lastRatedAt",
          (ARRAY_REMOVE(ARRAY_AGG(rt."stars" ORDER BY rt."ratedAt" DESC), NULL))[1] AS "lastStars",
          -- estado “aberto” (reserva/reading)
          MAX(CASE WHEN ro."id" IS NOT NULL THEN 1 ELSE 0 END) AS "hasOpenReading",
          MAX(CASE WHEN bro."id" IS NOT NULL THEN 1 ELSE 0 END) AS "hasOpenReservation"
        FROM "Book" b
        LEFT JOIN "BookReservation" br
          ON br."bookIsbn" = b."isbn" AND br."childId" = ${cid}
        LEFT JOIN "Reading" r
          ON r."bookIsbn" = b."isbn" AND r."childId" = ${cid}
        LEFT JOIN "Rating" rt
          ON rt."bookIsbn" = b."isbn" AND rt."childId" = ${cid}
        -- abertos
        LEFT JOIN LATERAL (
          SELECT r2."id"
          FROM "Reading" r2
          WHERE r2."childId"=${cid} AND r2."bookIsbn"=b."isbn" AND r2."finishedAt" IS NULL
          ORDER BY r2."id" DESC LIMIT 1
        ) ro ON TRUE
        LEFT JOIN LATERAL (
          SELECT br2."id"
          FROM "BookReservation" br2
          WHERE br2."childId"=${cid} AND br2."bookIsbn"=b."isbn"
            AND NOT EXISTS (
              SELECT 1 FROM "Reading" rx
              WHERE rx."reservationId" = br2."id"
            )
          ORDER BY br2."reservedAt" DESC LIMIT 1
        ) bro ON TRUE
        GROUP BY b."isbn"
      )
      SELECT
        b."isbn", b."title", b."coverUrl",
        -- similaridade com o perfil (cosine distance -> similarity)
        GREATEST(0, 1 - (b.embedding <=> cp.embedding)) AS base_sim,
        h."lastFinished",
        h."resCount", h."readCount", h."lastStars",
        h."hasOpenReading", h."hasOpenReservation",
        -- penalização de recência (muito recente → baixa ~30%)
        CASE
          WHEN h."lastFinished" IS NULL THEN 1.0
          WHEN h."lastFinished" > now() - interval '30 days' THEN 0.7
          WHEN h."lastFinished" > now() - interval '90 days' THEN 0.9
          ELSE 1.0
        END AS recency_factor,
        -- bónus por repetição (reservas/leituras anteriores)
        (1.0 + LEAST(0.20, 0.05 * h."resCount") + LEAST(0.30, 0.07 * h."readCount")) AS repeat_bonus,
        -- bónus por rating positivo (até +10%)
        (1.0 + COALESCE(GREATEST(0, (h."lastStars" - 3)) * 0.03, 0)) AS rating_bonus
      FROM "Book" b
      JOIN "ChildPreference" cp ON cp."childId" = ${cid}
      LEFT JOIN hist h ON h."isbn" = b."isbn"
      WHERE b.embedding IS NOT NULL
        ${excludeOpen ? Prisma.sql `AND COALESCE(h."hasOpenReading",0)=0 AND COALESCE(h."hasOpenReservation",0)=0` : Prisma.empty}
      ORDER BY (GREATEST(0, 1 - (b.embedding <=> cp.embedding)))  -- base
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
        // mapear status pro front
        const out = rows.map((r) => {
            let status = "none";
            if (Number(r.hasOpenReading || 0) > 0)
                status = "reading";
            else if (Number(r.hasOpenReservation || 0) > 0)
                status = "reserved";
            else if (r.lastFinished)
                status = "finished";
            return {
                isbn: r.isbn,
                title: r.title,
                coverUrl: r.coverUrl ?? null,
                status,
                lastFinished: r.lastFinished ?? null,
                // (opcional) expor pontuação para debug
                // score: Number(r.base_sim) /* *recency*repeat*rating (se precisares, calcula no SELECT) */,
            };
        });
        res.json(out);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
