"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/reservations.js
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * POST /api/reservations?childId=...
 * body: { isbn: string }
 * Regras:
 *  - Se já houver leitura ATIVA (startedAt!=null && finishedAt==null) → 409 already_reading
 *  - Se já houver leitura apenas RESERVADA (startedAt==null && finishedAt==null) → renovar reserva e ligar (sem erro)
 *  - Se já houver leitura TERMINADA → reset para reabrir (startedAt=NULL, finishedAt=NULL) e ligar à nova reserva
 *  - Se não houver leitura → criar reserva e criar leitura “reservada” (startedAt=NULL, finishedAt=NULL)
 *
 * Requisitos de schema:
 *  - Reading.startedAt: DateTime? (nullable, SEM default now())
 *  - @@unique([childId, bookIsbn], name: "childId_bookIsbn") em Reading e BookReservation
 */
router.post("/reservations", async (req, res) => {
    const bodyParse = zod_1.default.object({ isbn: zod_1.default.string().min(5) }).safeParse(req.body);
    if (!bodyParse.success) {
        return res
            .status(400)
            .json({ error: "bad_body", details: bodyParse.error.issues });
    }
    const queryParse = zod_1.default.object({ childId: zod_1.default.string() }).safeParse(req.query);
    if (!queryParse.success) {
        return res
            .status(400)
            .json({ error: "bad_query", details: queryParse.error.issues });
    }
    const childId = Number(queryParse.data.childId);
    const { isbn } = bodyParse.data;
    try {
        const result = await prisma.$transaction(async (tx) => {
            // validações
            const child = await tx.child.findUnique({
                where: { id: childId },
                select: { id: true },
            });
            if (!child)
                return {
                    type: "error",
                    status: 404,
                    payload: { error: "child_not_found", childId },
                };
            const book = await tx.book.findUnique({
                where: { isbn },
                select: { isbn: true },
            });
            if (!book)
                return {
                    type: "error",
                    status: 404,
                    payload: { error: "book_not_found", isbn },
                };
            // leitura única por (child,book)
            const reading = await tx.reading.findUnique({
                where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
                select: { id: true, startedAt: true, finishedAt: true, reservationId: true },
            });
            // upsert da reserva (unique [childId,bookIsbn])
            const reservation = await tx.bookReservation.upsert({
                where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
                create: { childId, bookIsbn: isbn },
                update: { reservedAt: new Date() }, // refresh da data
                select: { id: true, reservedAt: true },
            });
            if (reading) {
                const active = reading.startedAt != null && reading.finishedAt == null;
                const onlyReserved = reading.startedAt == null && reading.finishedAt == null;
                const finished = reading.finishedAt != null;
                if (active) {
                    // já está a ler → não pode reservar outra vez
                    return {
                        type: "error",
                        status: 409,
                        payload: {
                            error: "already_reading",
                            readingId: reading.id,
                            message: "Este livro já está a ser lido.",
                        },
                    };
                }
                if (onlyReserved) {
                    // já está “reservado” (sem leitura iniciada) → só garantir ligação à nova reserva
                    if (reading.reservationId !== reservation.id) {
                        await tx.reading.update({
                            where: { id: reading.id },
                            data: { reservationId: reservation.id },
                        });
                    }
                    return {
                        type: "ok",
                        status: 200,
                        payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt },
                    };
                }
                if (finished) {
                    // leitura antiga terminada → reabrir para novo ciclo
                    await tx.reading.update({
                        where: { id: reading.id },
                        data: { startedAt: null, finishedAt: null, reservationId: reservation.id },
                    });
                    return {
                        type: "ok",
                        status: 200,
                        payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt },
                    };
                }
            }
            // não existia leitura ainda → criar um registo “reservado”
            await tx.reading.create({
                data: {
                    childId,
                    bookIsbn: isbn,
                    reservationId: reservation.id,
                    startedAt: null,
                    finishedAt: null,
                },
            });
            return {
                type: "ok",
                status: 200,
                payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt },
            };
        });
        if (result.type === "error")
            return res.status(result.status).json(result.payload);
        return res.status(result.status).json(result.payload);
    }
    catch (e) {
        console.error("POST /reservations failed:", e);
        return res
            .status(500)
            .json({ error: "internal_error", detail: String(e?.message || e) });
    }
});
exports.default = router;
