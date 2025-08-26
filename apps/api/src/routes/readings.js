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
    const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

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
      // agora calculamos a "date" sem readAt
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
 */
router.post("/start", async (req, res) => {
  const body = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!body.success)
    return res.status(400).json({ error: "bad_body", details: body.error.issues });

  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const cid = await resolveChildId({ prisma, childId, familyId });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const book = await prisma.book.findUnique({
      where: { isbn: body.data.isbn },
      select: { isbn: true },
    });
    if (!book) return res.status(404).json({ error: "book_not_found" });

    // opcional: garantir que há reserva (sem campos inexistentes)
    await prisma.bookReservation.findFirst({
      where: { childId: cid, bookIsbn: book.isbn },
      orderBy: { reservedAt: "desc" },
      select: { id: true },
    });

    let reading = await prisma.reading.findFirst({
      where: { childId: cid, bookIsbn: book.isbn, finishedAt: null },
      orderBy: { id: "desc" },
      select: { id: true, startedAt: true, finishedAt: true },
    });

    if (!reading) {
      reading = await prisma.reading.create({
        data: { childId: cid, bookIsbn: book.isbn, startedAt: new Date() },
        select: { id: true, startedAt: true, finishedAt: true },
      });
    }

    res.json({ ok: true, reading });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/readings/finish?childId=...&familyId=...
 * body: { isbn: string }
 */
router.post("/finish", async (req, res) => {
  const body = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!body.success)
    return res.status(400).json({ error: "bad_body", details: body.error.issues });

  const childId = req.query.childId ? Number(req.query.childId) : undefined;
  const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;

  try {
    const cid = await resolveChildId({ prisma, childId, familyId });
    if (!cid) return res.status(400).json({ error: "missing_child" });

    const open = await prisma.reading.findFirst({
      where: { childId: cid, bookIsbn: body.data.isbn, finishedAt: null },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (!open) return res.status(404).json({ error: "no_open_reading" });

    const updated = await prisma.reading.update({
      where: { id: open.id },
      data: { finishedAt: new Date() },
      select: { id: true, startedAt: true, finishedAt: true },
    });

    res.json({ ok: true, reading: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
