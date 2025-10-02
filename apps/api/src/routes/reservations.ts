// apps/api/src/routes/reservations.ts
// Autor: Alexandre Brissos 21131
// O que faz: cria/renova reservas e sincroniza o registo de leitura único (child,book).
// Organização: helpers PUROS + serviço curto + handler < 30 linhas.

import { Router, type RequestHandler } from "express";
import z from "zod";
import { prisma } from "../prisma";

/* ============================ Schemas & Tipos ============================ */

const BodySchema = z.object({ isbn: z.string().min(5) });
const QuerySchema = z.object({
  childId: z.string().regex(/^\d+$/).transform(Number),
});

type OkPayload = { ok: true; id: number; reservedAt: Date };
type ErrPayload =
  | { error: "bad_body"; details: unknown }
  | { error: "bad_query"; details: unknown }
  | { error: "child_not_found"; childId: number }
  | { error: "book_not_found"; isbn: string }
  | { error: "already_reading"; readingId: number; message: string };

type ServiceOk = { type: "ok"; status: number; payload: OkPayload };
type ServiceErr = { type: "error"; status: number; payload: ErrPayload };
type ServiceResult = ServiceOk | ServiceErr;

/* ============================ Helpers PUROS ============================ */

// Classifica o estado de um registo Reading. Puro.
function readingState(
  r: { startedAt: Date | null; finishedAt: Date | null } | null | undefined
): "none" | "active" | "reservedOnly" | "finished" {
  if (!r) return "none";
  if (r.startedAt && !r.finishedAt) return "active";
  if (!r.startedAt && !r.finishedAt) return "reservedOnly";
  return "finished";
}

// Pequena fábrica de respostas de erro do serviço. Puro.
const err = (status: number, payload: ErrPayload): ServiceErr => ({
  type: "error",
  status,
  payload,
});

/* ============================ Serviço (DB) ============================ */

// Regras de negócio dentro de uma transação. Retorna um resultado neutro (sem HTTP).
export async function reserveBookForChild(
  childId: number,
  isbn: string
): Promise<ServiceResult> {
  return prisma.$transaction(async (tx) => {
    // validações base
    const child = await tx.child.findUnique({ where: { id: childId }, select: { id: true } });
    if (!child) return err(404, { error: "child_not_found", childId });

    const book = await tx.book.findUnique({ where: { isbn }, select: { isbn: true } });
    if (!book) return err(404, { error: "book_not_found", isbn });

    // leitura única por (child,book)
    const reading = await tx.reading.findUnique({
      where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
      select: { id: true, startedAt: true, finishedAt: true, reservationId: true },
    });

    // upsert da reserva (unique [childId,bookIsbn]) – também “renova” reservedAt
    const reservation = await tx.bookReservation.upsert({
      where: { childId_bookIsbn: { childId, bookIsbn: isbn } },
      create: { childId, bookIsbn: isbn },
      update: { reservedAt: new Date() },
      select: { id: true, reservedAt: true },
    });

    // decide fluxo por estado
    switch (readingState(reading)) {
      case "active":
        return err(409, {
          error: "already_reading",
          readingId: reading!.id,
          message: "Este livro já está a ser lido.",
        });

      case "reservedOnly":
        if (reading!.reservationId !== reservation.id) {
          await tx.reading.update({
            where: { id: reading!.id },
            data: { reservationId: reservation.id },
          });
        }
        return { type: "ok", status: 200, payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt } };

      case "finished":
        await tx.reading.update({
          where: { id: reading!.id },
          data: { startedAt: null, finishedAt: null, reservationId: reservation.id },
        });
        return { type: "ok", status: 200, payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt } };

      case "none":
        await tx.reading.create({
          data: { childId, bookIsbn: isbn, reservationId: reservation.id, startedAt: null, finishedAt: null },
        });
        return { type: "ok", status: 200, payload: { ok: true, id: reservation.id, reservedAt: reservation.reservedAt } };
    }
  });
}

/* ============================ Handler (<= 30 linhas) ============================ */

const postReservations: RequestHandler = async (req, res) => {
  // valida body e query de forma explícita
  const b = BodySchema.safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "bad_body", details: b.error.issues });
  const q = QuerySchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "bad_query", details: q.error.issues });

  try {
    const result = await reserveBookForChild(q.data.childId, b.data.isbn);
    return result.type === "error"
      ? res.status(result.status).json(result.payload)
      : res.status(result.status).json(result.payload);
  } catch (e: any) {
    console.error("POST /reservations failed:", e);
    return res.status(500).json({ error: "internal_error", detail: e?.message ?? String(e) });
  }
};

/* ============================ Router ============================ */

const router = Router();
/**
 * POST /api/reservations?childId=...
 * body: { isbn: string }
 * Regras:
 *  - ativa → 409 already_reading
 *  - reservada → liga à nova reserva e OK
 *  - terminada → reset para reservado e OK
 *  - sem leitura → cria leitura “reservada” e OK
 * Requisitos schema:
 *  - Reading.startedAt: DateTime? (nullable, sem default)
 *  - @@unique([childId, bookIsbn]) em Reading e BookReservation
 */
router.post("/reservations", postReservations);

export default router;
