// apps/api/src/routes/consultations/consultations.ts
import { Router } from "express";
import { $Enums, ConsultationStatus, PrismaClient } from "@prisma/client";
import { requireFamilyOrLibrarian, requireRole, ROLES, withUser } from "../../middlewares/auth";

const prisma = new PrismaClient();
const r = Router();

// POST /api/consultations
r.post("/", withUser, requireFamilyOrLibrarian, async (req, res) => {
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
r.post("/:id/confirm", withUser, requireFamilyOrLibrarian, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultation.update({
    where: { id },
    data: { status: "CONFIRMED", events: { create: { type: "CONFIRMED" } } },
  });
  res.json(c);
});

r.post("/:id/decline", withUser, requireFamilyOrLibrarian, async (req, res) => {
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

r.post("/:id/cancel", withUser, requireFamilyOrLibrarian, async (req, res) => {
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

r.post(
  "/:id/complete",
  withUser,
  requireFamilyOrLibrarian,
  async (req, res) => {
    const id = Number(req.params.id);
    const c = await prisma.consultation.update({
      where: { id },
      data: { status: "COMPLETED", events: { create: { type: "COMPLETED" } } },
    });
    res.json(c);
  }
);

/** ---------- Listagens ---------- */
// GET /api/consultations/all  (debug/QA)
r.get("/all", withUser, requireFamilyOrLibrarian, async (req, res) => {
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
r.get("/next", withUser, requireFamilyOrLibrarian, async (req, res) => {
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

// GET /api/consultations/librarians?libraryId=123
r.get("/librarians", withUser, requireFamilyOrLibrarian, async (req, res) => {
  try {
    const libraryId = req.query.libraryId
      ? Number(req.query.libraryId)
      : undefined;

    const librarians = await prisma.user.findMany({
      where: {
        userRoles: { some: { roleId: 2 } }, // ⬅️ só roleId=2
        ...(Number.isFinite(libraryId)
          ? { userLibraries: { some: { libraryId } } }
          : {}),
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });

    res.json(librarians.map((u) => ({ id: u.id, name: u.fullName })));
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ error: e?.message ?? "failed to list librarians" });
  }
});

// GET /api/consultations/slots?from&to&libraryId&librarianId&onlyBookable=true
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

    const onlyBookable = String(req.query.onlyBookable ?? "true") === "true";
    const now = new Date();

    const librarianId = req.query.librarianId
      ? Number(req.query.librarianId)
      : undefined;
    const libraryId = req.query.libraryId
      ? Number(req.query.libraryId)
      : undefined;

    const items = await prisma.consultationSlot.findMany({
      where: {
        status: $Enums.SlotStatus.OPEN,
        startAt: { gte: onlyBookable ? (from > now ? from : now) : from }, // ⬅️ só futuro
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
        librarian: { select: { fullName: true } },
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
      librarianName: s.librarian?.fullName ?? null,
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

// GET /api/consultations/librarians/with-open-slots?from&to&libraryId
r.get(
  "/librarians/with-open-slots",
  withUser,
  requireFamilyOrLibrarian,
  async (req, res) => {
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

      const now = new Date();
      const effFrom = from > now ? from : now; // só futuro
      const libraryId = req.query.libraryId
        ? Number(req.query.libraryId)
        : undefined;

      const librarians = await prisma.user.findMany({
        where: {
          userRoles: { some: { roleId: 2 } },
          consultationSlots: {
            some: {
              status: $Enums.SlotStatus.OPEN,
              startAt: { gte: effFrom },
              endAt: { lte: to },
              ...(Number.isFinite(libraryId) ? { libraryId } : {}),
            },
          },
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      });

      res.json(librarians.map((u) => ({ id: u.id, name: u.fullName })));
    } catch (e: any) {
      console.error(e);
      res
        .status(400)
        .json({
          error: e?.message ?? "failed to list librarians with open slots",
        });
    }
  }
);

r.post("/:id/confirm", withUser, requireRole(ROLES.LIBRARIAN, ROLES.ADMIN), async (req, res) => {
  const id = Number(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const c = await tx.consultation.findUnique({
        where: { id },
        include: { slot: true },
      });
      if (!c) return res.status(404).json({ error: "not found" });

      // só o bibliotecário dono (ou admin) confirma
      const isAdmin = req.user?.roles?.includes(ROLES.ADMIN) === true;
      if (!isAdmin && req.user?.id !== c.librarianId) {
        return res.status(403).json({ error: "forbidden" });
      }

      if (!c.startAt || !c.endAt) {
        return res.status(400).json({ error: "consulta sem horário para confirmar" });
      }

      // conflito com outras CONFIRMED
      const conflict = await tx.consultation.findFirst({
        where: {
          librarianId: c.librarianId,
          status: ConsultationStatus.CONFIRMED,
          startAt: { lt: c.endAt },
          endAt:   { gt: c.startAt },
          id: { not: c.id },
        },
        select: { id: true, startAt: true, endAt: true, familyId: true },
      });
      if (conflict) {
        return res.status(409).json({ error: "conflict", conflict });
      }

      // marca slot BOOKED (se existir) e confirma
      if (c.slotId) {
        await tx.consultationSlot.update({ where: { id: c.slotId }, data: { status: "BOOKED" } });
      }

      const updated = await tx.consultation.update({
        where: { id: c.id },
        data: { status: ConsultationStatus.CONFIRMED, events: { create: { type: "CONFIRMED", actorId: req.user?.id } } },
      });

      return updated;
    });

    if (result && !("error" in (result as any))) return res.json(result);
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) {
      return res.status(409).json({ error: "concurrency" });
    }
    console.error(e);
  }

  return res.status(400).json({ error: "failed to confirm" });
});

export default r;
