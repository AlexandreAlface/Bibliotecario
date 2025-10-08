"use strict";
// apps/api/src/routes/readings.ts
// Autor: Alexandre Brissos 21131
// Rotas de leituras: listar, começar e terminar.
// Estrutura: helpers PUROS → services (DB) → handlers (RequestHandler, <30 linhas).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../../prisma");
const _helpers_1 = require("./_helpers");
const StartFinishBody = zod_1.default.object({ isbn: zod_1.default.string().min(5) });
// ------------------------- Helpers PUROS -------------------------
// num(): converte input em number finito ou undefined (puro).
function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
// clampLimit(): limita o número de resultados (puro).
function clampLimit(v, def = 10, min = 1, max = 100) {
    const n = Number(v ?? def);
    return Math.min(Math.max(Number.isFinite(n) ? n : def, min), max);
}
// mapRow(): mapeia linha DB -> DTO de resposta (puro).
function mapRow(r) {
    return {
        id: Number(r.id),
        isbn: r.isbn,
        title: r.title,
        coverUrl: r.coverUrl ?? null,
        date: r.finishedAt ?? r.startedAt ?? null,
        startedAt: r.startedAt ?? null,
        finishedAt: r.finishedAt ?? null,
        childId: r.childId ?? undefined,
        childName: r.childName ?? null,
        stars: r.ratingStars ?? null,
        comment: r.ratingComment ?? null,
    };
}
// ------------------------- Services (DB) -------------------------
// listReadings(): lista leituras de uma criança ou de toda a família.
async function listReadings(pr, { limit, childId, familyId }) {
    const whereChild = childId != null
        ? client_1.Prisma.sql `r."childId" = ${childId}`
        : client_1.Prisma.sql `r."childId" IN (
           SELECT cf."childId" FROM "ChildFamily" cf WHERE cf."familyId" = ${familyId}
         )`;
    const rows = await pr.$queryRaw `
    SELECT
      r."id", r."startedAt", r."finishedAt",
      r."bookIsbn" AS "isbn", b."title", b."coverUrl",
      c."id" AS "childId", c."name" AS "childName",
      rt."stars" AS "ratingStars", rt."comment" AS "ratingComment"
    FROM "Reading" r
    JOIN "Book"  b ON b."isbn" = r."bookIsbn"
    JOIN "Child" c ON c."id"   = r."childId"
    LEFT JOIN LATERAL (
      SELECT ra."stars", ra."comment", ra."ratedAt"
      FROM "Rating" ra
      WHERE ra."childId" = r."childId" AND ra."bookIsbn" = r."bookIsbn"
      ORDER BY ra."ratedAt" DESC
      LIMIT 1
    ) rt ON TRUE
    WHERE ${whereChild}
    ORDER BY COALESCE(r."finishedAt", r."startedAt") DESC, r."id" DESC
    LIMIT ${limit};
  `;
    return rows.map(mapRow);
}
// ensureBookExists(): valida existência do livro antes de iniciar leitura.
async function ensureBookExists(pr, isbn) {
    const b = await pr.book.findUnique({ where: { isbn }, select: { isbn: true } });
    return Boolean(b);
}
// startReading(): aplica regras de início de leitura (upsert reserva, (re)abrir).
async function startReading(pr, childId, isbn) {
    return pr.$transaction(async (tx) => {
        const resv = await tx.bookReservation.upsert({
            where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
            create: { childId, bookIsbn: isbn },
            update: { reservedAt: new Date() },
            select: { id: true },
        });
        const reading = await tx.reading.findUnique({
            where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
            select: { id: true, startedAt: true, finishedAt: true },
        });
        if (reading && reading.startedAt && !reading.finishedAt) {
            return { kind: "error", status: 409, payload: { error: "already_reading", readingId: reading.id } };
        }
        const data = {
            startedAt: new Date(),
            finishedAt: null,
            reservationId: resv.id,
        };
        if (reading) {
            const updated = await tx.reading.update({
                where: { id: reading.id },
                data,
                select: { id: true, childId: true, bookIsbn: true, startedAt: true, finishedAt: true, reservationId: true },
            });
            return { kind: "ok", status: 200, payload: { ok: true, reading: updated } };
        }
        const created = await tx.reading.create({
            data: { childId, bookIsbn: isbn, ...data },
            select: { id: true, childId: true, bookIsbn: true, startedAt: true, finishedAt: true, reservationId: true },
        });
        return { kind: "ok", status: 200, payload: { ok: true, reading: created } };
    });
}
// finishReading(): termina a leitura aberta e consome reserva.
async function finishReading(pr, childId, isbn) {
    return pr.$transaction(async (tx) => {
        const open = await tx.reading.findFirst({
            where: { childId, bookIsbn: isbn, finishedAt: null },
            orderBy: { id: "desc" },
            select: { id: true },
        });
        if (!open)
            return { kind: "error", status: 404, payload: { error: "no_open_reading" } };
        const updated = await tx.reading.update({
            where: { id: open.id },
            data: { finishedAt: new Date() },
            select: { id: true, startedAt: true, finishedAt: true },
        });
        await tx.bookReservation.deleteMany({ where: { childId, bookIsbn: isbn } });
        return { kind: "ok", status: 200, payload: { ok: true, reading: updated } };
    });
}
// ------------------------- Handlers (< 30 linhas) -------------------------
const getReadingsHandler = async (req, res, next) => {
    try {
        const limit = clampLimit(req.query.limit, 10, 1, 100);
        const childId = num(req.query.childId);
        const familyId = num(req.query.familyId);
        if (!childId && !familyId) {
            res.json([]);
            return;
        }
        const items = await listReadings(prisma_1.prisma, { limit, childId, familyId });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
const startReadingHandler = async (req, res) => {
    const parsed = StartFinishBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "bad_body", details: parsed.error.issues });
        return;
    }
    const childIdQ = num(req.query.childId);
    const familyId = num(req.query.familyId);
    try {
        const cid = await (0, _helpers_1.resolveChildId)({ prisma: prisma_1.prisma, childId: childIdQ, familyId });
        if (!cid) {
            res.status(400).json({ error: "missing_child" });
            return;
        }
        const isbn = parsed.data.isbn;
        if (!(await ensureBookExists(prisma_1.prisma, isbn))) {
            res.status(404).json({ error: "book_not_found" });
            return;
        }
        const result = await startReading(prisma_1.prisma, cid, isbn);
        res.status(result.status).json(result.payload);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
};
const finishReadingHandler = async (req, res) => {
    const parsed = StartFinishBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "bad_body", details: parsed.error.issues });
        return;
    }
    const childIdQ = num(req.query.childId);
    const familyId = num(req.query.familyId);
    try {
        const cid = await (0, _helpers_1.resolveChildId)({ prisma: prisma_1.prisma, childId: childIdQ, familyId });
        if (!cid) {
            res.status(400).json({ error: "missing_child" });
            return;
        }
        const result = await finishReading(prisma_1.prisma, cid, parsed.data.isbn);
        res.status(result.status).json(result.payload);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
};
// ------------------------- Router -------------------------
const router = (0, express_1.Router)();
/**
 * GET /api/readings?limit=&childId=&familyId=
 * Lista leituras (criança ou agregado familiar).
 */
router.get("/", getReadingsHandler);
/**
 * POST /api/readings/start?childId=&familyId=
 * Inicia (ou reabre) uma leitura. Regras:
 * - Se já existe leitura aberta → 409 already_reading
 * - Se existia leitura fechada/reservada → reabre agora
 * - Senão, cria leitura nova
 */
router.post("/start", startReadingHandler);
/**
 * POST /api/readings/finish?childId=&familyId=
 * Termina a leitura aberta e consome a reserva.
 */
router.post("/finish", finishReadingHandler);
exports.default = router;
