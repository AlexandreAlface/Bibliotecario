// apps/api/src/routes/readings.js
import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import z from "zod";
import { resolveChildId } from "./_helpers.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/readings
 * Query:
 *  - limit?: number
 *  - childId?: number
 *  - familyId?: number
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    const familyId = req.query.familyId
      ? Number(req.query.familyId)
      : undefined;

    if (!childId && !familyId) return res.json([]);

    const whereChild =
      childId != null
        ? Prisma.sql`r."childId" = ${childId}`
        : Prisma.sql`r."childId" IN (
            SELECT cf."childId"
            FROM "ChildFamily" cf
            WHERE cf."familyId" = ${familyId}
          )`;

    const rows = await prisma.$queryRaw`
      SELECT
        r."id",
        r."startedAt",
        r."finishedAt",
        r."bookIsbn" AS "isbn",
        b."title",
        b."coverUrl",
        c."id"   AS "childId",
        c."name" AS "childName",
        rt."stars"   AS "ratingStars",
        rt."comment" AS "ratingComment"
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

    const out = rows.map((r) => ({
      id: Number(r.id),
      isbn: r.isbn,
      title: r.title,
      coverUrl: r.coverUrl ?? null,
      date: r.finishedAt ?? r.startedAt ?? null,
      startedAt: r.startedAt ?? null,
      finishedAt: r.finishedAt ?? null,
      childId: r.childId ? Number(r.childId) : undefined,
      childName: r.childName ?? null,
      stars: r.ratingStars ?? null,
      comment: r.ratingComment ?? null,
    }));

    res.json(out);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/readings/start?childId=...&familyId=...
 * body: { isbn: string }
 *
 * Regras:
 *  - Se há uma leitura aberta (finishedAt = null): 409 already_reading
 *  - Se existe uma leitura antiga (terminada): "reset" (startedAt = now, finishedAt = null) e liga à reserva atual
 *  - Se não existe leitura: cria nova
 *  - A reserva é upsert única por (child, book) para ter um id estável a ligar
 */
router.post("/start", async (req, res) => {
  const body = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!body.success)
    return res
      .status(400)
      .json({ error: "bad_body", details: body.error.issues });

  const childIdQ = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const cid = await resolveChildId({ prisma, childId: childIdQ, familyId });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const isbn = body.data.isbn;

    const book = await prisma.book.findUnique({
      where: { isbn },
      select: { isbn: true },
    });
    if (!book) return res.status(404).json({ error: "book_not_found" });

    const result = await prisma.$transaction(async (tx) => {
      // 1) Reserva única (cria se não existir, ou "refresh" na data)
      const resv = await tx.bookReservation.upsert({
        where: { childId_bookIsbn: { childId: cid, bookIsbn: isbn } },
        create: { childId: cid, bookIsbn: isbn },
        update: { reservedAt: new Date() },
        select: { id: true },
      });

      // 2) Ler (se existir) a leitura ÚNICA por (child,book)
      const reading = await tx.reading.findUnique({
        where: { childId_bookIsbn: { childId: cid, bookIsbn: isbn } },
        select: { id: true, startedAt: true, finishedAt: true },
      });

      if (reading) {
        const isActive =
          reading.startedAt != null && reading.finishedAt == null;
        const isOnlyReserved =
          reading.startedAt == null && reading.finishedAt == null;
        const wasFinished = reading.finishedAt != null;

        if (isActive) {
          // já está a ler → bloquear
          return {
            type: "error",
            status: 409,
            payload: {
              error: "already_reading",
              readingId: reading.id,
              message: "Já existe uma leitura em curso para este livro.",
            },
          };
        }

        // RESERVADA ou TERMINADA → (re)abrir agora
        const updated = await tx.reading.update({
          where: { id: reading.id },
          data: {
            startedAt: new Date(), // ← começa agora
            finishedAt: null, // ← aberto
            reservationId: resv.id,
          },
          select: {
            id: true,
            childId: true,
            bookIsbn: true,
            startedAt: true,
            finishedAt: true,
            reservationId: true,
          },
        });

        return {
          type: "ok",
          status: 200,
          payload: { ok: true, reading: updated },
        };
      }

      // 3) Não existia leitura → criar já como “a ler”
      const created = await tx.reading.create({
        data: {
          childId: cid,
          bookIsbn: isbn,
          reservationId: resv.id,
          startedAt: new Date(), // ← começa já
          finishedAt: null,
        },
        select: {
          id: true,
          childId: true,
          bookIsbn: true,
          startedAt: true,
          finishedAt: true,
          reservationId: true,
        },
      });

      return {
        type: "ok",
        status: 200,
        payload: { ok: true, reading: created },
      };
    });

    if (result.type === "error")
      return res.status(result.status).json(result.payload);
    return res.status(result.status).json(result.payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/readings/finish?childId=...&familyId=...
 * body: { isbn: string }
 */
router.post("/finish", async (req, res) => {
  const body = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!body.success)
    return res
      .status(400)
      .json({ error: "bad_body", details: body.error.issues });

  const childIdQ = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const cid = await resolveChildId({ prisma, childId: childIdQ, familyId });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const isbn = body.data.isbn;

    const result = await prisma.$transaction(async (tx) => {
      // leitura aberta
      const open = await tx.reading.findFirst({
        where: { childId: cid, bookIsbn: isbn, finishedAt: null },
        orderBy: { id: "desc" },
        select: { id: true },
      });
      if (!open)
        return {
          type: "error",
          status: 404,
          payload: { error: "no_open_reading" },
        };

      // terminar leitura
      const updated = await tx.reading.update({
        where: { id: open.id },
        data: { finishedAt: new Date() },
        select: { id: true, startedAt: true, finishedAt: true },
      });

      // ✅ consumir a reserva correspondente (se existir)
      await tx.bookReservation.deleteMany({
        where: { childId: cid, bookIsbn: isbn },
      });

      return {
        type: "ok",
        status: 200,
        payload: { ok: true, reading: updated },
      };
    });

    if (result.type === "error")
      return res.status(result.status).json(result.payload);
    return res.status(result.status).json(result.payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
