import { Router } from "express";
import { $Enums, PrismaClient, SlotStatus } from "@prisma/client";
import { requireRole, ROLES } from "../../middlewares/auth";

const prisma = new PrismaClient();
const r = Router();

// GET /api/consultations/librarians/:librarianId/slots?from=...&to=...
r.get("/librarians/:librarianId/slots", async (req, res) => {
  try {
    const librarianId = Number(req.params.librarianId);
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));
    if (!Number.isFinite(librarianId) || isNaN(+from) || isNaN(+to)) {
      return res
        .status(400)
        .json({ error: "librarianId, from e to são obrigatórios" });
    }

    const slots = await prisma.consultationSlot.findMany({
      where: { librarianId, startAt: { gte: from }, endAt: { lte: to } },
      orderBy: { startAt: "asc" },
    });
    res.json(slots);
  } catch (e: any) {
    console.error(e);
    res
      .status(400)
      .json({ error: e?.message ?? "failed to list librarian slots" });
  }
});

// POST /api/consultations/librarians/:librarianId/slots/bulk
r.post(
  "/librarians/:librarianId/slots/bulk",
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN),
  async (req: any, res) => {
    try {
      const librarianId = Number(req.params.librarianId);
      const items = (req.body?.slots ?? []).map((s: any) => ({
        librarianId,
        startAt: new Date(s.startAt),
        endAt: new Date(s.endAt),
        libraryId: s.libraryId ?? null,
        status: s.status ?? SlotStatus.OPEN,
      }));
      const created = await prisma.consultationSlot.createMany({
        data: items,
        skipDuplicates: true,
      });
      res.json({ created: created.count });
    } catch (e: any) {
      console.error(e);
      res
        .status(400)
        .json({ error: e?.message ?? "failed to bulk create slots" });
    }
  }
);

// PATCH /api/consultations/slots/:id  body: { status: 'OPEN' | 'BLOCKED' }
r.patch(
  "/slots/:id",
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status as SlotStatus;
      if (!["OPEN", "BLOCKED"].includes(status)) {
        return res.status(400).json({ error: "invalid status" });
      }
      const slot = await prisma.consultationSlot.update({
        where: { id },
        data: { status },
      });
      res.json(slot);
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e?.message ?? "failed to update slot" });
    }
  }
);

/**
 * GET /api/consultations/slots?from&to&libraryId&librarianId
 * Devolve slots OPEN no intervalo indicado (com nome do bibliotecário e da biblioteca)
 */
r.get("/slots", async (req, res) => {
  try {
    const fromStr = String(req.query.from || "");
    const toStr = String(req.query.to || "");
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(+from) || isNaN(+to)) {
      return res
        .status(400)
        .json({ error: "from e to (ISO) são obrigatórios" });
    }

    const librarianId = req.query.librarianId
      ? Number(req.query.librarianId)
      : undefined;
    const libraryId = req.query.libraryId
      ? Number(req.query.libraryId)
      : undefined;

    const items = await prisma.consultationSlot.findMany({
      where: {
        status: $Enums.SlotStatus.OPEN,
        startAt: { gte: from },
        endAt: { lte: to },
        ...(Number.isFinite(librarianId) ? { librarianId } : {}),
        ...(Number.isFinite(libraryId) ? { libraryId } : {}),
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        librarianId: true,
        // ⚠️ Se o teu User não tiver avatarUrl no schema, NÃO seleciones:
        librarian: { select: { fullName: true /*, avatarUrl: true */ } },
        libraryId: true,
        library: { select: { name: true } },
      },
    });

    const mapped = items.map((s) => ({
      id: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      status: s.status,
      librarianId: s.librarianId,
      librarianName: s.librarian?.fullName,
      // se adicionares avatarUrl ao schema e ao select acima, devolve-o aqui:
      librarianAvatarUrl: null as string | null,
      libraryId: s.libraryId ?? undefined,
      libraryName: s.library?.name ?? undefined,
    }));

    res.json(mapped);
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ error: e?.message ?? "failed to list slots" });
  }
});

export default r;
