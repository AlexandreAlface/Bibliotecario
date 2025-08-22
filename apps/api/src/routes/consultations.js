// apps/api/src/routes.js
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// Aceita estados em PT/EN para compatibilidade com dados existentes
const ACTIVE_STATUSES = ["PENDENTE", "CONFIRMADO", "Pending", "Confirmed"];

/* Util */
const toInt = (v, def = undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

/**
 * Handler reutilizável para próximas consultas
 * GET /api/next?limit=3&familyId=1
 * GET /api/upcoming?limit=3&familyId=1 (alias)
 */
async function getNext(req, res, next) {
   try {
    const limit = Number(req.query.limit ?? 3);
    const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;
    const librarianId = req.query.librarianId ? Number(req.query.librarianId) : undefined;

    const now = new Date();

    const list = await prisma.consultation.findMany({
      where: {
        // futuras
        scheduledAt: { gte: now },
        // status confirmado ou pendente, sem sensibilidade a maiúsculas
        OR: [
          { status: { equals: "CONFIRMADO", mode: "insensitive" } },
          { status: { equals: "PENDENTE", mode: "insensitive" } },
          { status: { equals: "Confirmed", mode: "insensitive" } },
          { status: { equals: "Pending", mode: "insensitive" } },
        ],
        ...(familyId ? { familyId } : {}),
        ...(librarianId ? { librarianId } : {}),
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        familyId: true,
        librarianId: true,
        librarian: { select: { fullName: true } },
      },
    });

    const data = list.map((c) => ({
      id: c.id,
      title: "Consulta",
      date: c.scheduledAt ? c.scheduledAt.toISOString() : undefined,
      time: c.scheduledAt
        ? c.scheduledAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
        : "",
      status: c.status,
      familyId: c.familyId,
      librarianId: c.librarianId,
      librarianName: c.librarian?.fullName ?? "",
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : undefined,
    }));

    res.json(data);
  } catch (err) {
    next(err);

  }
}

router.get("/next", getNext);
router.get("/upcoming", getNext); // alias

/**
 * GET /api
 * Filtros: ?status=...&familyId=...&librarianId=...&from=ISO_DATE
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, from } = req.query;
    const familyId = toInt(req.query.familyId);
    const librarianId = toInt(req.query.librarianId);

    const where = {
      ...(status ? { status } : {}),
      ...(familyId ? { familyId } : {}),
      ...(librarianId ? { librarianId } : {}),
      ...(from ? { scheduledAt: { gte: new Date(from) } } : {}),
    };

    const items = await prisma.consultation.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: { librarian: { select: { fullName: true } } },
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api
 * body: { familyId, librarianId, scheduledAt?, status? = 'PENDENTE' }
 * requestedAt é default do Prisma
 */
router.post("/", async (req, res, next) => {
  try {
    const { familyId, librarianId, scheduledAt, status } = req.body;

    if (!familyId || !librarianId) {
      return res
        .status(400)
        .json({ error: "familyId e librarianId são obrigatórios" });
    }

    const created = await prisma.consultation.create({
      data: {
        familyId: Number(familyId),
        librarianId: Number(librarianId),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: status || "PENDENTE",
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/:id
 * body (parcial): { scheduledAt?, status? }
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

    const updated = await prisma.consultation.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.consultation.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
