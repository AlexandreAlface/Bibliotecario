// src/routes/consultations.js
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

/**
 * GET /api/consultations/next?limit=3&familyId=1
 * Devolve próximas consultas (por data de marcação), a partir de agora.
 * - Filtra opcionalmente por família / criança / bibliotecário.
 * - Campos textuais de status: 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO'
 */
router.get("/next", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 3);
    const familyId = req.query.familyId
      ? Number(req.query.familyId)
      : undefined;
    const librarianId = req.query.librarianId
      ? Number(req.query.librarianId)
      : undefined;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;

    const list = await prisma.consultation.findMany({
      where: {
        // próximas (têm scheduledAt futuro)
        scheduledAt: { gte: new Date() },
        status: { in: ["PENDENTE", "CONFIRMADO"] },
        ...(familyId ? { familyId } : {}),
        ...(librarianId ? { librarianId } : {}),
        ...(childId ? { childId } : {}), // <-- só se adicionares childId ao modelo no futuro
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        familyId: true,
        librarianId: true,
      },
    });

    // shape amigável ao mobile
    const data = list.map((c) => ({
      id: c.id,
      title: "Consulta",
      date: c.scheduledAt ? c.scheduledAt.toLocaleDateString("pt-PT") : "",
      time: c.scheduledAt
        ? c.scheduledAt.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      status: c.status,
      familyId: c.familyId,
      librarianId: c.librarianId,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/consultations
 * Lista geral com filtros simples
 * ?status=PENDENTE|CONFIRMADO|RECUSADO&familyId=...&librarianId=...
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, familyId, librarianId } = req.query;
    const items = await prisma.consultation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(familyId ? { familyId: Number(familyId) } : {}),
        ...(librarianId ? { librarianId: Number(librarianId) } : {}),
      },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/consultations
 * body: { familyId, librarianId, scheduledAt?, status? = 'PENDENTE' }
 * `requestedAt` é preenchido pelo default do Prisma
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
 * PATCH /api/consultations/:id
 * Atualiza campos (ex.: { scheduledAt, status })
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

/** DELETE /api/consultations/:id */
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
