// apps/api/src/routes/reservations.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import z from "zod";

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /api/reservations?childId=...
 * body: { isbn: string }
 * -> cria SEM dedupe (a criança pode reservar o mesmo livro várias vezes)
 */
router.post("/reservations", async (req, res) => {
  const bodyParse = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!bodyParse.success) {
    return res.status(400).json({ error: "bad_body", details: bodyParse.error.issues });
  }
  const queryParse = z.object({ childId: z.string() }).safeParse(req.query);
  if (!queryParse.success) {
    return res.status(400).json({ error: "bad_query", details: queryParse.error.issues });
  }

  const childId = Number(queryParse.data.childId);
  const { isbn } = bodyParse.data;

  try {
    // valida criança
    const child = await prisma.child.findUnique({ where: { id: childId }, select: { id: true } });
    if (!child) return res.status(404).json({ error: "child_not_found", childId });

    // valida livro
    const book = await prisma.book.findUnique({ where: { isbn }, select: { isbn: true } });
    if (!book) return res.status(404).json({ error: "book_not_found", isbn });

    // cria SEM dedupe
    const row = await prisma.bookReservation.create({
      data: { childId, bookIsbn: isbn },
      select: { id: true, reservedAt: true },
    });

    return res.json({ ok: true, id: row.id, reservedAt: row.reservedAt });
  } catch (e) {
    console.error("POST /reservations failed:", e);
    return res.status(500).json({ error: "internal_error", detail: String(e?.message || e) });
  }
});

/**
 * GET /api/reservations?childId=... | ?familyId=...&limit=20
 * -> lista reservas por criança OU por família (todas as crianças dessa família)
 */
router.get("/reservations", async (req, res) => {
  const qParse = z.object({
    childId: z.string().optional(),
    familyId: z.string().optional(),
    limit: z.string().optional(),
  }).safeParse(req.query);

  if (!qParse.success) {
    return res.status(400).json({ error: "bad_query", details: qParse.error.issues });
  }

  const limit = Math.min(Number(qParse.data.limit ?? 20), 100);
  const childId = qParse.data.childId ? Number(qParse.data.childId) : undefined;
  const familyId = qParse.data.familyId ? Number(qParse.data.familyId) : undefined;

  try {
    const where = childId
      ? { childId }
      : familyId
      ? { child: { families: { some: { familyId } } } }
      : null;

    if (!where) return res.status(400).json({ error: "missing_child_or_family" });

    const rows = await prisma.bookReservation.findMany({
      where,
      orderBy: { reservedAt: "desc" },
      take: limit,
      select: { id: true, childId: true, bookIsbn: true, reservedAt: true },
    });

    res.json(rows);
  } catch (e) {
    console.error("GET /reservations failed:", e);
    return res.status(500).json({ error: "internal_error", detail: String(e?.message || e) });
  }
});

export default router;
