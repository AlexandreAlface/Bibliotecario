// ESM como o resto do projeto
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import z from "zod";

const prisma = new PrismaClient();
const router = Router();

// tenta obter um utilizador autenticado (fallback em dev)
function getAuthUserId(req) {
  return (
    (req.user && Number(req.user.id)) ||
    (req.session && Number(req.session.userId)) ||
    Number(req.headers["x-user-id"]) ||
    Number(req.query.userId) || // dev
    null
  );
}

// resolve o userId (familyId) a partir de: familyId explícito > childId > auth
async function resolveFamilyUserId({ req, childId, familyId, prisma }) {
  if (Number.isFinite(familyId)) return Number(familyId);

  if (Number.isFinite(childId)) {
    const cf = await prisma.childFamily.findFirst({
      where: { childId: Number(childId) },
      select: { familyId: true },
      orderBy: { familyId: "asc" },
    });
    if (cf?.familyId) return Number(cf.familyId);
  }

  const authId =
    (req.user && Number(req.user.id)) ||
    (req.session && Number(req.session.userId)) ||
    Number(req.headers["x-user-id"]) ||
    Number(req.query.userId) ||
    null;

  return Number.isFinite(authId) ? Number(authId) : null;
}

/**
 * POST /api/reservations?childId=...&familyId=...
 * body: { isbn: string }
 * - Só enviamos o ISBN; o servidor descobre o familyId via childId (ou usa o fornecido).
 */
router.post("/reservations", async (req, res) => {
  const bodyParse = z.object({ isbn: z.string().min(5) }).safeParse(req.body);
  if (!bodyParse.success) {
    return res
      .status(400)
      .json({ error: "bad_body", details: bodyParse.error.issues });
  }

  const qParse = z
    .object({ childId: z.string().optional(), familyId: z.string().optional() })
    .safeParse(req.query);
  if (!qParse.success) {
    return res
      .status(400)
      .json({ error: "bad_query", details: qParse.error.issues });
  }

  const childId = qParse.data.childId ? Number(qParse.data.childId) : undefined;
  const familyId = qParse.data.familyId
    ? Number(qParse.data.familyId)
    : undefined;

  try {
    const userId = await resolveFamilyUserId({ req, childId, familyId });
    if (!Number.isFinite(userId)) {
      return res
        .status(401)
        .json({ error: "unauthenticated_or_no_family_for_child" });
    }

    const { isbn } = bodyParse.data;

    // valida se o livro existe (evita erro de FK)
    const book = await prisma.book.findUnique({
      where: { isbn },
      select: { isbn: true },
    });
    if (!book) return res.status(404).json({ error: "book_not_found", isbn });

    // evita duplicado para (userId, bookIsbn)
    const existing = await prisma.bookReservation.findFirst({
      where: { userId, bookIsbn: isbn },
      select: { id: true, reservedAt: true },
    });

    const row =
      existing ||
      (await prisma.bookReservation.create({
        data: {
          userId,
          bookIsbn: isbn,
          // opcionalmente podias usar relations:
          // user: { connect: { id: userId } },
          // book: { connect: { isbn } },
        },
        select: { id: true, reservedAt: true },
      }));

    return res.json({ ok: true, id: row.id, reservedAt: row.reservedAt });
  } catch (e) {
    console.error("POST /reservations failed:", e);
    return res
      .status(500)
      .json({ error: "internal_error", detail: String(e?.message || e) });
  }
});

/**
 * GET /api/reservations?limit=20&childId=...&familyId=...
 * Lista reservas do tutor (family)
 */
router.get("/reservations", async (req, res) => {
  const qParse = z
    .object({
      limit: z.string().optional(),
      childId: z.string().optional(),
      familyId: z.string().optional(),
    })
    .safeParse(req.query);
  if (!qParse.success) {
    return res
      .status(400)
      .json({ error: "bad_query", details: qParse.error.issues });
  }

  const limit = Math.min(Number(qParse.data.limit ?? 20), 100);
  const childId = qParse.data.childId ? Number(qParse.data.childId) : undefined;
  const familyId = qParse.data.familyId
    ? Number(qParse.data.familyId)
    : undefined;

  try {
    const userId = await resolveFamilyUserId({ req, childId, familyId });
    if (!Number.isFinite(userId)) {
      return res
        .status(401)
        .json({ error: "unauthenticated_or_no_family_for_child" });
    }

    const rows = await prisma.bookReservation.findMany({
      where: { userId },
      orderBy: { reservedAt: "desc" },
      take: limit,
      select: { id: true, bookIsbn: true, reservedAt: true },
    });

    res.json(rows);
  } catch (e) {
    console.error("GET /reservations failed:", e);
    return res
      .status(500)
      .json({ error: "internal_error", detail: String(e?.message || e) });
  }
});

export default router;
