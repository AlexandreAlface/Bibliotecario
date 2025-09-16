import { Router } from "express";
import {
  PrismaClient,
  ConsultationStatus,
  ProposalStatus,
  SlotStatus,
  ProposalActor,
} from "@prisma/client";
import { withUser, requireRole, ROLES } from "../../middlewares/auth";

const prisma = new PrismaClient();
const r = Router();

// Utilitário: conflito do bibliotecário em [start,end)
async function findLibrarianConflict(
  librarianId: number,
  startAt: Date,
  endAt: Date,
  excludeConsultationId?: number
) {
  return prisma.consultation.findFirst({
    where: {
      librarianId,
      status: ConsultationStatus.CONFIRMED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeConsultationId ? { id: { not: excludeConsultationId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true, familyId: true },
  });
}

// POST /api/v1/consultations/:id/proposals  (retoques: validação leve)
r.post("/consultations/:id/proposals", withUser, async (req, res) => {
  const id = Number(req.params.id);
  const { proposedBy, toStartAt, toEndAt, message } = req.body;

  const c = await prisma.consultation.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ error: "not found" });

  const start = new Date(toStartAt),
    end = new Date(toEndAt);
  if (isNaN(+start) || isNaN(+end) || !(start < end)) {
    return res.status(400).json({ error: "invalid dates" });
  }

  const p = await prisma.consultationProposal.create({
    data: {
      consultationId: id,
      proposedBy, // assume valor válido do enum
      fromStartAt: c.startAt,
      fromEndAt: c.endAt,
      toStartAt: start,
      toEndAt: end,
      message,
      status: ProposalStatus.PENDING,
    },
  });
  await prisma.consultationEvent.create({
    data: {
      consultationId: id,
      type: "RESCHEDULE_PROPOSED",
      actorId: req.user?.id,
    },
  });
  res.json(p);
});

// POST /api/v1/proposals/:proposalId/accept  ✅ versão com conflitos + estados
r.post(
  "/proposals/:proposalId/accept",
  withUser,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN, ROLES.FAMILY), // ⬅️ família pode aceitar
  async (req, res) => {
    const proposalId = Number(req.params.proposalId);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const p = await tx.consultationProposal.findUnique({
          where: { id: proposalId },
          include: { consultation: true },
        });
        if (!p || p.status !== ProposalStatus.PENDING)
          throw new Error("invalid proposal");
        const c = p.consultation!;
        const isAdmin = req.user?.roles?.includes(ROLES.ADMIN) === true;
        const isLibrarian = req.user?.id === c.librarianId;
        const isFamily = req.user?.id === c.familyId;

        // regras de autorização:
        // - bibliotecário/admin podem sempre aceitar
        // - família só pode aceitar propostas feitas pelo bibliotecário
        if (
          !isAdmin &&
          !isLibrarian &&
          !(isFamily && p.proposedBy === ProposalActor.LIBRARIAN)
        ) {
          return res.status(403).json({ error: "forbidden" });
        }

        const startAt = new Date(p.toStartAt);
        const endAt = new Date(p.toEndAt);

        // conflito com outras CONFIRMED do bibliotecário
        const conflict = await findLibrarianConflict(
          c.librarianId,
          startAt,
          endAt,
          c.id
        );
        if (conflict) {
          return res.status(409).json({ error: "conflict", conflict });
        }

        // libertar slot anterior se existir
        if (c.slotId) {
          await tx.consultationSlot.update({
            where: { id: c.slotId },
            data: { status: SlotStatus.OPEN },
          });
        }

        // garantir slot para o intervalo novo
        let slot = await tx.consultationSlot.findFirst({
          where: { librarianId: c.librarianId, startAt, endAt },
        });
        if (!slot) {
          slot = await tx.consultationSlot.create({
            data: {
              librarianId: c.librarianId,
              libraryId: c.libraryId ?? null,
              startAt,
              endAt,
              status: SlotStatus.OPEN,
            },
          });
        }
        if (slot.status !== SlotStatus.OPEN) {
          return res
            .status(409)
            .json({ error: "slot not open", slotStatus: slot.status });
        }

        await tx.consultationSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.BOOKED },
        });

        const updated = await tx.consultation.update({
          where: { id: c.id },
          data: {
            status: ConsultationStatus.CONFIRMED,
            startAt,
            endAt,
            slot: { connect: { id: slot.id } },
          },
        });

        const now = new Date();
        await tx.consultationProposal.update({
          where: { id: proposalId },
          data: {
            status: ProposalStatus.ACCEPTED,
            decidedAt: now,
            decidedById: req.user?.id ?? null,
          },
        });
        await tx.consultationProposal.updateMany({
          where: {
            consultationId: c.id,
            id: { not: proposalId },
            status: ProposalStatus.PENDING,
          },
          data: { status: ProposalStatus.EXPIRED, decidedAt: now },
        });

        await tx.consultationEvent.create({
          data: {
            consultationId: c.id,
            type: "RESCHEDULE_ACCEPTED",
            actorId: req.user?.id,
            payload: { proposalId },
          },
        });

        return updated;
      });

      res.json(result);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) {
        return res.status(409).json({ error: "concurrency" });
      }
      console.error(e);
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }
);
// POST /api/v1/proposals/:proposalId/decline  (retoque: decidedBy)
r.post(
  "/proposals/:proposalId/decline",
  withUser,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN, ROLES.FAMILY), // ⬅️ família também pode recusar
  async (req, res) => {
    const proposalId = Number(req.params.proposalId);
    const p = await prisma.consultationProposal.findUnique({
      where: { id: proposalId },
      include: { consultation: true },
    });
    if (!p) return res.status(404).json({ error: "not found" });

    const c = p.consultation!;
    const isAdmin = req.user?.roles?.includes(ROLES.ADMIN) === true;
    const isLibrarian = req.user?.id === c.librarianId;
    const isFamily = req.user?.id === c.familyId;

    if (!isAdmin && !isLibrarian && !isFamily) {
      return res.status(403).json({ error: "forbidden" });
    }

    const upd = await prisma.consultationProposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.DECLINED,
        decidedAt: new Date(),
        decidedById: req.user?.id ?? null,
      },
    });
    await prisma.consultationEvent.create({
      data: {
        consultationId: c.id,
        type: "RESCHEDULE_DECLINED",
        actorId: req.user?.id,
        payload: { proposalId },
      },
    });
    res.json(upd);
  }
);

// LISTAR PROPOSTAS DO BIBLIOTECÁRIO (pendentes por omissão)
// GET /api/v1/librarians/:librarianId/proposals?status=PENDING&page=1&limit=20
r.get(
  "/families/:familyId/proposals",
  withUser,
  requireRole(ROLES.FAMILY, ROLES.ADMIN),
  async (req, res) => {
    const familyId = Number(req.params.familyId);
    const status = String(req.query.status || "PENDING") as any;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const isAdmin = req.user?.roles?.includes(ROLES.ADMIN) === true;
    if (!isAdmin && req.user?.id !== familyId) {
      return res.status(403).json({ error: "forbidden" });
    }

    const where = { status, consultation: { familyId } };
    const [items, total] = await Promise.all([
      prisma.consultationProposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          consultation: {
            select: {
              id: true,
              librarian: { select: { id: true, fullName: true } },
              child: { select: { id: true, name: true } },
              startAt: true,
              endAt: true,
            },
          },
        },
      }),
      prisma.consultationProposal.count({ where }),
    ]);

    res.json({
      page,
      limit,
      total,
      items: items.map((p) => ({
        id: p.id,
        status: p.status,
        proposedBy: p.proposedBy,
        toStartAt: p.toStartAt,
        toEndAt: p.toEndAt,
        fromStartAt: p.fromStartAt,
        fromEndAt: p.fromEndAt,
        message: p.message,
        consultation: p.consultation,
      })),
    });
  }
);

// PRÉ-CHECK DE CONFLITO POR INTERVALO
// GET /api/v1/librarians/:librarianId/conflicts?startAt=...&endAt=...&excludeConsultationId=123
r.get(
  "/librarians/:librarianId/conflicts",
  withUser,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN),
  async (req, res) => {
    const librarianId = Number(req.params.librarianId);
    const startAt = new Date(String(req.query.startAt));
    const endAt = new Date(String(req.query.endAt));
    const excludeConsultationId = req.query.excludeConsultationId
      ? Number(req.query.excludeConsultationId)
      : undefined;

    const isAdmin = req.user?.roles?.includes(ROLES.ADMIN) === true;
    if (!isAdmin && req.user?.id !== librarianId)
      return res.status(403).json({ error: "forbidden" });

    if (isNaN(+startAt) || isNaN(+endAt) || !(startAt < endAt)) {
      return res.status(400).json({ error: "invalid dates" });
    }

    const conflict = await prisma.consultation.findFirst({
      where: {
        librarianId,
        status: "CONFIRMED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeConsultationId
          ? { id: { not: excludeConsultationId } }
          : {}),
      },
      select: { id: true, startAt: true, endAt: true, familyId: true },
    });

    res.json({ conflict: conflict || null });
  }
);

export default r;
