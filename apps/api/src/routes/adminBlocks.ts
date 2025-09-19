import { Router } from "express";
import { prisma } from "../prisma";
import { requireRole, ROLES } from "../middlewares/auth";

const r = Router();

// GET /admin/libraries/:libraryId/blocks
r.get(
  "/admin/libraries/:libraryId/blocks",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      if (!Number.isFinite(libraryId) || libraryId <= 0)
        return res.status(400).json({ error: "libraryId inválido" });

      const slots = await prisma.consultationSlot.findMany({
        where: {
          status: "BLOCKED",
          consultation: null,
          OR: [
            { libraryId },
            { librarian: { userLibraries: { some: { libraryId } } } },
          ],
        },
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, endAt: true },
      });

      res.json(slots.map(s => ({
        id: s.id,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        reason: null as string | null, // sem coluna no schema
      })));
    } catch (e) { next(e); }
  }
);

// POST /admin/libraries/:libraryId/blocks
r.post(
  "/admin/libraries/:libraryId/blocks",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      const { startAt, endAt } = (req.body ?? {}) as { startAt?: string; endAt?: string; reason?: string };
      if (!Number.isFinite(libraryId) || libraryId <= 0)
        return res.status(400).json({ error: "libraryId inválido" });

      const start = new Date(startAt || "");
      const end = new Date(endAt || "");
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end)
        return res.status(400).json({ error: "janela inválida" });

      // escolhe 1 bibliotecário da biblioteca para “ancorar” o slot bloqueado
      const anyLib = await prisma.user.findFirst({
        where: {
          userLibraries: { some: { libraryId } },
          userRoles: { some: { role: { name: { in: ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"] } } } },
        },
        select: { id: true },
      });
      if (!anyLib) return res.status(409).json({ error: "biblioteca sem bibliotecários" });

      const created = await prisma.consultationSlot.create({
        data: {
          librarianId: anyLib.id,
          libraryId,
          startAt: start,
          endAt: end,
          status: "BLOCKED",
        },
        select: { id: true, startAt: true, endAt: true },
      });

      res.status(201).json({
        id: created.id,
        startAt: created.startAt.toISOString(),
        endAt: created.endAt.toISOString(),
        reason: null,
      });
    } catch (e) { next(e); }
  }
);

// DELETE /admin/libraries/:libraryId/blocks/:id
r.delete(
  "/admin/libraries/:libraryId/blocks/:id",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      const id = Number(req.params.id);
      if (!Number.isFinite(libraryId) || libraryId <= 0)
        return res.status(400).json({ error: "libraryId inválido" });
      if (!Number.isFinite(id) || id <= 0)
        return res.status(400).json({ error: "id inválido" });

      // valida pertença
      const slot = await prisma.consultationSlot.findUnique({
        where: { id },
        select: {
          id: true, libraryId: true,
          librarian: { select: { userLibraries: { select: { libraryId: true } } } },
        },
      });
      if (!slot) return res.status(404).json({ error: "não encontrado" });

      const belongs =
        slot.libraryId === libraryId ||
        slot.librarian.userLibraries.some(ul => ul.libraryId === libraryId);
      if (!belongs) return res.status(403).json({ error: "sem acesso" });

      await prisma.consultationSlot.delete({ where: { id } });
      res.status(204).end();
    } catch (e) { next(e); }
  }
);

export default r;
