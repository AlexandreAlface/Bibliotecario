// apps/api/src/routes/consultations/consultations.ts
import { Router } from "express";
import { $Enums, PrismaClient } from "@prisma/client";
import { requireFamilyOrLibrarian } from "../../middlewares/auth";

const prisma = new PrismaClient();
const r = Router();

// POST /api/consultations
r.post("/", requireFamilyOrLibrarian, async (req, res) => {
  try {
    const {
      familyId,
      librarianId,
      childId,
      libraryId,
      mode,
      location,
      slotId,
    } = req.body as {
      familyId: number | string;
      librarianId: number | string;
      childId?: number | string;
      libraryId?: number | string;
      mode?: string;
      location?: string;
      slotId?: number | string;
    };

    const _familyId = Number(familyId);
    const _librarianId = Number(librarianId);
    const _childId = childId != null ? Number(childId) : undefined;
    const _libraryId = libraryId != null ? Number(libraryId) : undefined;
    const _slotId = slotId != null ? Number(slotId) : undefined;

    if (!Number.isFinite(_familyId) || !Number.isFinite(_librarianId)) {
      return res
        .status(400)
        .json({ error: "familyId e librarianId obrigatórios" });
    }

    if (_slotId) {
      const result = await prisma.$transaction(async (tx) => {
        const slot = await tx.consultationSlot.findUnique({
          where: { id: _slotId },
        });
        if (!slot) throw new Error("slot inexistente");
        if (slot.status !== $Enums.SlotStatus.OPEN)
          throw new Error("slot indisponível");
        if (slot.librarianId !== _librarianId)
          throw new Error("slot pertence a outro bibliotecário");

        const c = await tx.consultation.create({
          data: {
            family: { connect: { id: _familyId } },
            librarian: { connect: { id: _librarianId } },
            child: _childId ? { connect: { id: _childId } } : undefined,
            library: _libraryId ? { connect: { id: _libraryId } } : undefined,
            mode,
            location,
            startAt: slot.startAt,
            endAt: slot.endAt,
            status: $Enums.ConsultationStatus.PENDING,
            slot: { connect: { id: _slotId } }, // 1–1 via unique slotId
            events: { create: [{ type: "REQUESTED" }] },
          },
        });

        await tx.consultationSlot.update({
          where: { id: _slotId },
          data: { status: $Enums.SlotStatus.BOOKED },
        });

        return c;
      });

      return res.json(result);
    }

    // Sem slot: criação pendente sem horário
    const c = await prisma.consultation.create({
      data: {
        family: { connect: { id: _familyId } },
        librarian: { connect: { id: _librarianId } },
        child: _childId ? { connect: { id: _childId } } : undefined,
        library: _libraryId ? { connect: { id: _libraryId } } : undefined,
        mode,
        location,
        status: $Enums.ConsultationStatus.PENDING,
        events: { create: [{ type: "REQUESTED" }] },
      },
    });

    return res.json(c);
  } catch (e: any) {
    console.error(e);
    return res
      .status(400)
      .json({ error: e?.message ?? "failed to create consultation" });
  }
});

/** ---------- Ações ---------- */
r.post("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "CONFIRMED", events: { create: { type: "CONFIRMED" } } },
  });
  res.json(c);
});

r.post("/:id/decline", async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "DECLINED", events: { create: { type: "DECLINED" } } },
  });
  if (c.slotId) {
    await prisma.consultationSlot.update({
      where: { id: c.slotId },
      data: { status: $Enums.SlotStatus.OPEN },
    });
  }
  res.json(c);
});

r.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "CANCELLED", events: { create: { type: "CANCELLED" } } },
  });
  if (c.slotId) {
    await prisma.consultationSlot.update({
      where: { id: c.slotId },
      data: { status: $Enums.SlotStatus.OPEN },
    });
  }
  res.json(c);
});

r.post("/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "COMPLETED", events: { create: { type: "COMPLETED" } } },
  });
  res.json(c);
});

/** ---------- Listagens ---------- */
// GET /api/consultations/all  (debug/QA)
r.get("/all", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const statusParam = (req.query.status as string | undefined)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) as $Enums.ConsultationStatus[];

    const order: "asc" | "desc" = req.query.order === "desc" ? "desc" : "asc";
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const librarianId = req.query.librarianId
      ? Number(req.query.librarianId)
      : undefined;
    const familyId = req.query.familyId
      ? Number(req.query.familyId)
      : undefined;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;

    const where: any = {};
    if (statusParam?.length) where.status = { in: statusParam };
    if (from || to)
      where.startAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    if (Number.isFinite(librarianId)) where.librarianId = librarianId;
    if (Number.isFinite(familyId)) where.familyId = familyId;
    if (Number.isFinite(childId)) where.childId = childId;

    const items = await prisma.consultation.findMany({
      where,
      take: limit,
      orderBy: [{ startAt: order }, { id: "desc" }],
      include: {
        family: { select: { id: true, fullName: true, email: true } },
        librarian: { select: { id: true, fullName: true, email: true } },
        child: { select: { id: true, name: true } },
        library: { select: { id: true, name: true } },
        slot: {
          select: { id: true, startAt: true, endAt: true, status: true },
        },
        events: {
          select: { id: true, type: true, at: true, actorId: true },
          orderBy: { at: "desc" },
          take: 5,
        },
      },
    });

    res.json(items);
  } catch (e: any) {
    console.error(e);
    res
      .status(400)
      .json({ error: e?.message ?? "failed to list consultations" });
  }
});

/** GET /api/consultations/next
 *  Próximas consultas (para landing): filtra por família OU bibliotecário.
 *  Query: limit, familyId, librarianId (um dos dois), from (default now)
 */
r.get("/next", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 50);
    const now = req.query.from ? new Date(String(req.query.from)) : new Date();

    const familyId = req.query.familyId
      ? Number(req.query.familyId)
      : undefined;
    const librarianId = req.query.librarianId
      ? Number(req.query.librarianId)
      : undefined;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;

    if (!Number.isFinite(familyId) && !Number.isFinite(librarianId)) {
      return res
        .status(400)
        .json({ error: "familyId ou librarianId são obrigatórios" });
    }

    const where: any = {
      status: {
        in: [
          $Enums.ConsultationStatus.PENDING,
          $Enums.ConsultationStatus.CONFIRMED,
        ],
      },
      startAt: { gte: now }, // sem pendentes sem data aqui
    };
    if (Number.isFinite(familyId)) where.familyId = familyId;
    if (Number.isFinite(librarianId)) where.librarianId = librarianId;
    if (Number.isFinite(childId)) where.childId = childId; // ⬅️ Filtro por criança

    const items = await prisma.consultation.findMany({
      where,
      take: limit,
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        family: { select: { id: true, fullName: true } },
        librarian: { select: { id: true, fullName: true } },
        child: { select: { id: true, name: true } },
        library: { select: { id: true, name: true } },
      },
    });

    const mapped = items.map((c) => ({
      id: c.id,
      title: c.child?.name
        ? `Consulta de ${c.child.name}`
        : `Consulta com ${c.librarian?.fullName ?? "bibliotecário"}`,
      date: c.startAt?.toISOString(),
      scheduledAt: c.startAt?.toISOString(),
      status: c.status,
      librarianName: c.librarian?.fullName ?? undefined,
      familyId: c.family?.id,
      childId: c.child?.id,
      libraryName: c.library?.name,
    }));

    res.json(mapped);
  } catch (e: any) {
    console.error(e);
    res
      .status(400)
      .json({ error: e?.message ?? "failed to list next consultations" });
  }
});

export default r;
