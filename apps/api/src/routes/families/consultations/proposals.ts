// apps/api/src/routes/families/consultations/proposals.ts
// O que faz: cancelar consulta, propor/aceitar/recusar reagendamentos,
// listar propostas (por bibliotecário/família) e pré-check de conflitos.
// Estilo: helpers PUROS → serviços curtos (DB) → handlers Express (≤ 30 linhas)

import { Router, type Request, type Response, type RequestHandler } from "express";
import {
  PrismaClient,
  ConsultationStatus,
  ProposalStatus,
  SlotStatus,
  ProposalActor,
  Prisma,
} from "@prisma/client";
import { requireRole, ROLES, withUser } from "../../../middlewares/auth";

const prisma = new PrismaClient();
const r = Router();

/* ============================== Helpers PUROS ============================== */

type Authed = Request & { user?: { id?: number; roles?: string[] } };

class ApiError extends Error {
  code: number;
  payload?: unknown;
  constructor(code: number, message: string, payload?: unknown) {
    super(message);
    this.code = code;
    this.payload = payload;
  }
}

const asInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const asDate = (v: unknown) => {
  const d = v ? new Date(String(v)) : undefined;
  return d && !isNaN(+d) ? d : undefined;
};

const isAdmin = (req: Authed) => (req.user?.roles || []).includes(ROLES.ADMIN);
const isActorFamily = (req: Authed, familyId: number) => req.user?.id === familyId;
const isActorLibrarian = (req: Authed, librarianId: number) => req.user?.id === librarianId;

const parseProposalStatus = (s?: string): ProposalStatus | undefined => {
  const up = String(s || "").toUpperCase();
  return (Object.values(ProposalStatus) as string[]).includes(up) ? (up as ProposalStatus) : undefined;
};

/* ============================== Serviços (DB) ============================== */

// Conflito do bibliotecário em [start,end)
async function svcFindLibrarianConflict(librarianId: number, startAt: Date, endAt: Date, excludeId?: number) {
  return prisma.consultation.findFirst({
    where: {
      librarianId,
      status: ConsultationStatus.CONFIRMED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true, familyId: true },
  });
}

// Cancelar consulta (autorizações + libertar slot + expirar propostas + evento)
async function svcCancelConsultation(id: number, req: Authed, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const c = await tx.consultation.findUnique({ where: { id }, include: { slot: true } });
    if (!c) throw new ApiError(404, "not_found");

    const allowed = isAdmin(req) || isActorLibrarian(req, c.librarianId) || isActorFamily(req, c.familyId);
    if (!allowed) throw new ApiError(403, "forbidden");

    if (c.status === ConsultationStatus.CANCELLED) throw new ApiError(409, "already_cancelled");
    if (c.status === ConsultationStatus.COMPLETED) throw new ApiError(409, "completed");
    if (c.status === ConsultationStatus.DECLINED) throw new ApiError(409, "invalid_state");

    if (c.slotId) await tx.consultationSlot.update({ where: { id: c.slotId }, data: { status: SlotStatus.OPEN } });

    const updated = await tx.consultation.update({
      where: { id: c.id },
      data: { status: ConsultationStatus.CANCELLED, slotId: null },
    });

    const now = new Date();
    await tx.consultationProposal.updateMany({
      where: { consultationId: c.id, status: ProposalStatus.PENDING },
      data: { status: ProposalStatus.EXPIRED, decidedAt: now },
    });

    await tx.consultationEvent.create({
      data: {
        consultationId: c.id,
        type: "CONSULTATION_CANCELLED",
        actorId: req.user?.id ?? null,
        payload: { reason },
      },
    });

    return updated;
  });
}

// Upsert de proposta (valida estado/ator; cria evento de created/updated)
async function svcUpsertProposal(
  consultationId: number,
  proposedBy: ProposalActor,
  toStartAt: Date,
  toEndAt: Date,
  message: string | null,
  actorId: number | null
) {
  const c = await prisma.consultation.findUnique({ where: { id: consultationId } });
  if (!c) throw new ApiError(404, "not_found");

  // ⚠️ Fix TS: comparar com || evita o erro de includes() com enum
  if (c.status === ConsultationStatus.CANCELLED || c.status === ConsultationStatus.COMPLETED) {
    throw new ApiError(409, "invalid_state");
  }
  if (isNaN(+toStartAt) || isNaN(+toEndAt) || !(toStartAt < toEndAt)) {
    throw new ApiError(400, "invalid_dates");
  }

  const existing = await prisma.consultationProposal.findFirst({
    where: { consultationId, status: ProposalStatus.PENDING },
  });

  if (existing) {
    if (existing.proposedBy !== proposedBy) throw new ApiError(409, "pending_proposal_other_actor");
    if (+existing.toStartAt === +toStartAt && +existing.toEndAt === +toEndAt) return existing;

    const prev = { prevToStartAt: existing.toStartAt, prevToEndAt: existing.toEndAt };
    const upd = await prisma.consultationProposal.update({
      where: { id: existing.id },
      data: {
        fromStartAt: existing.fromStartAt ?? c.startAt ?? null,
        fromEndAt: existing.fromEndAt ?? c.endAt ?? null,
        toStartAt,
        toEndAt,
        message: message ?? existing.message,
      },
    });

    await prisma.consultationEvent.create({
      data: {
        consultationId,
        type: "RESCHEDULE_PROPOSED_UPDATED",
        actorId,
        payload: { proposalId: existing.id, ...prev },
      },
    });

    return upd;
  }

  const p = await prisma.consultationProposal.create({
    data: {
      consultationId,
      proposedBy,
      fromStartAt: c.startAt ?? null,
      fromEndAt: c.endAt ?? null,
      toStartAt,
      toEndAt,
      message,
      status: ProposalStatus.PENDING,
    },
  });

  await prisma.consultationEvent.create({
    data: { consultationId, type: "RESCHEDULE_PROPOSED", actorId, payload: { proposalId: p.id } },
  });

  return p;
}

// Aceitar proposta (autorização por ator; conflito; reservar slot; atualizar estados)
async function svcAcceptProposal(proposalId: number, req: Authed) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.consultationProposal.findUnique({ where: { id: proposalId }, include: { consultation: true } });
    if (!p || p.status !== ProposalStatus.PENDING) throw new ApiError(400, "invalid proposal");

    const c = p.consultation!;
    const admin = isAdmin(req);
    const isLib = isActorLibrarian(req, c.librarianId);
    const isFam = isActorFamily(req, c.familyId);

    // Regras: LIBRARIAN propõe → FAMÍLIA aceita; FAMILY propõe → LIBRARIAN aceita; SYSTEM → ambos
    const allowed =
      admin ||
      (p.proposedBy === ProposalActor.LIBRARIAN && isFam) ||
      (p.proposedBy === ProposalActor.FAMILY && isLib) ||
      (p.proposedBy === ProposalActor.SYSTEM && (isLib || isFam));
    if (!allowed) throw new ApiError(403, "forbidden");

    const startAt = new Date(p.toStartAt);
    const endAt = new Date(p.toEndAt);

    const conflict = await svcFindLibrarianConflict(c.librarianId, startAt, endAt, c.id);
    if (conflict) throw new ApiError(409, "conflict", { conflict });

    // libertar slot antigo (se existir)
    if (c.slotId) await tx.consultationSlot.update({ where: { id: c.slotId }, data: { status: SlotStatus.OPEN } });

    // garantir slot OPEN para o novo intervalo (cria se não existir)
    let slot = await tx.consultationSlot.findFirst({ where: { librarianId: c.librarianId, startAt, endAt } });
    if (!slot) {
      slot = await tx.consultationSlot.create({
        data: { librarianId: c.librarianId, libraryId: c.libraryId ?? null, startAt, endAt, status: SlotStatus.OPEN },
      });
    }
    if (slot.status !== SlotStatus.OPEN) throw new ApiError(409, "slot not open", { slotStatus: slot.status });

    await tx.consultationSlot.update({ where: { id: slot.id }, data: { status: SlotStatus.BOOKED } });

    const updated = await tx.consultation.update({
      where: { id: c.id },
      data: { status: ConsultationStatus.CONFIRMED, startAt, endAt, slot: { connect: { id: slot.id } } },
    });

    const now = new Date();
    await tx.consultationProposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.ACCEPTED, decidedAt: now, decidedById: req.user?.id ?? null },
    });
    await tx.consultationProposal.updateMany({
      where: { consultationId: c.id, id: { not: proposalId }, status: ProposalStatus.PENDING },
      data: { status: ProposalStatus.EXPIRED, decidedAt: now },
    });
    await prisma.consultationEvent.create({
      data: { consultationId: c.id, type: "RESCHEDULE_ACCEPTED", actorId: req.user?.id, payload: { proposalId } },
    });

    return updated;
  });
}

// Rejeitar proposta (marca DECLINED + evento)
async function svcDeclineProposal(proposalId: number, req: Authed) {
  const p = await prisma.consultationProposal.findUnique({ where: { id: proposalId }, include: { consultation: true } });
  if (!p) throw new ApiError(404, "not found");
  const c = p.consultation!;
  const allowed = isAdmin(req) || isActorLibrarian(req, c.librarianId) || isActorFamily(req, c.familyId);
  if (!allowed) throw new ApiError(403, "forbidden");

  const upd = await prisma.consultationProposal.update({
    where: { id: proposalId },
    data: { status: ProposalStatus.DECLINED, decidedAt: new Date(), decidedById: req.user?.id ?? null },
  });
  await prisma.consultationEvent.create({
    data: { consultationId: c.id, type: "RESCHEDULE_DECLINED", actorId: req.user?.id, payload: { proposalId } },
  });
  return upd;
}

// Listar propostas do bibliotecário (paginado, status opcional)
async function svcListProposalsForLibrarian(librarianId: number, status?: ProposalStatus, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: Prisma.ConsultationProposalWhereInput = {
    ...(status ? { status } : {}),
    consultation: { is: { librarianId } },
  };
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
            family: { select: { id: true, fullName: true } },
            child: { select: { id: true, name: true } },
            startAt: true,
            endAt: true,
          },
        },
      },
    }),
    prisma.consultationProposal.count({ where }),
  ]);
  return { page, limit, total, items };
}

// Listar propostas da família (paginado, status opcional)
async function svcListProposalsForFamily(familyId: number, status?: ProposalStatus, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: Prisma.ConsultationProposalWhereInput = {
    ...(status ? { status } : {}),
    consultation: { is: { familyId } },
  };
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
  return { page, limit, total, items };
}

/* ============================== Handlers (≤ 30 linhas) ============================== */

// POST /api/v1/consultations/:id/cancel
r.post(
  "/consultations/:id/cancel",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN, ROLES.FAMILY) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const id = asInt(aReq.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    try {
      const out = await svcCancelConsultation(id, aReq, (aReq.body as any)?.reason);
      res.json(out);
    } catch (e: any) {
      if (e instanceof ApiError) return res.status(e.code).json({ error: e.message, ...(e.payload ? { payload: e.payload } : {}) });
      const msg = String(e?.message || "");
      if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) return res.status(409).json({ error: "concurrency" });
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }) as RequestHandler
);

// POST /api/v1/consultations/:id/proposals  (cria/atualiza PENDING do mesmo ator)
r.post(
  "/:id/proposals",
  withUser as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const id = asInt(aReq.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });
    try {
      const proposedBy: ProposalActor = (aReq.body?.proposedBy as ProposalActor) ?? ProposalActor.LIBRARIAN;
      const start = asDate(aReq.body?.toStartAt);
      const end = asDate(aReq.body?.toEndAt);
      if (!start || !end) return res.status(400).json({ error: "invalid_dates" });

      const p = await svcUpsertProposal(id, proposedBy, start, end, aReq.body?.message ?? null, aReq.user?.id ?? null);
      res.json(p);
    } catch (e: any) {
      if (e instanceof ApiError) return res.status(e.code).json({ error: e.message });
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }) as RequestHandler
);

// GET /api/v1/librarians/:librarianId/proposals
r.get(
  "/librarians/:librarianId/proposals",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const librarianId = asInt(aReq.params.librarianId);
    if (!librarianId) return res.status(400).json({ error: "invalid_id" });
    const admin = isAdmin(aReq);
    if (!admin && !isActorLibrarian(aReq, librarianId)) return res.status(403).json({ error: "forbidden" });

    const status = parseProposalStatus(String(aReq.query.status || "PENDING"));
    const page = Math.max(1, Number(aReq.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(aReq.query.limit || 20)));

    const { items, total } = await svcListProposalsForLibrarian(librarianId, status, page, limit);
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
        consultation: (p as any).consultation,
      })),
    });
  }) as RequestHandler
);

// POST /api/v1/proposals/:proposalId/accept
r.post(
  "/proposals/:proposalId/accept",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN, ROLES.FAMILY) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const proposalId = asInt(aReq.params.proposalId);
    if (!proposalId) return res.status(400).json({ error: "invalid_id" });
    try {
      const out = await svcAcceptProposal(proposalId, aReq);
      res.json(out);
    } catch (e: any) {
      if (e instanceof ApiError) return res.status(e.code).json({ error: e.message, ...(e.payload ? { payload: e.payload } : {}) });
      const msg = String(e?.message || "");
      if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) return res.status(409).json({ error: "concurrency" });
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }) as RequestHandler
);

// POST /api/v1/proposals/:proposalId/decline
r.post(
  "/proposals/:proposalId/decline",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN, ROLES.FAMILY) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const proposalId = asInt(aReq.params.proposalId);
    if (!proposalId) return res.status(400).json({ error: "invalid_id" });
    try {
      const upd = await svcDeclineProposal(proposalId, aReq);
      res.json(upd);
    } catch (e: any) {
      if (e instanceof ApiError) return res.status(e.code).json({ error: e.message });
      res.status(400).json({ error: e?.message ?? "error" });
    }
  }) as RequestHandler
);

// GET /api/v1/families/:familyId/proposals
r.get(
  "/families/:familyId/proposals",
  withUser as RequestHandler,
  requireRole(ROLES.FAMILY, ROLES.ADMIN) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const familyId = asInt(aReq.params.familyId);
    if (!familyId) return res.status(400).json({ error: "invalid_id" });
    const admin = isAdmin(aReq);
    if (!admin && !isActorFamily(aReq, familyId)) return res.status(403).json({ error: "forbidden" });

    const status = parseProposalStatus(String(aReq.query.status || "PENDING"));
    const page = Math.max(1, Number(aReq.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(aReq.query.limit || 20)));

    const { items, total } = await svcListProposalsForFamily(familyId, status, page, limit);
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
        consultation: (p as any).consultation,
      })),
    });
  }) as RequestHandler
);

// GET /api/v1/librarians/:librarianId/conflicts?startAt&endAt&excludeConsultationId
r.get(
  "/librarians/:librarianId/conflicts",
  withUser as RequestHandler,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN) as RequestHandler,
  (async (req, res) => {
    const aReq = req as Authed;
    const librarianId = asInt(aReq.params.librarianId);
    const startAt = asDate(aReq.query.startAt);
    const endAt = asDate(aReq.query.endAt);
    const excludeId = asInt(aReq.query.excludeConsultationId);
    if (!librarianId) return res.status(400).json({ error: "invalid_id" });
    if (!startAt || !endAt || !(startAt < endAt)) return res.status(400).json({ error: "invalid dates" });

    const admin = isAdmin(aReq);
    if (!admin && !isActorLibrarian(aReq, librarianId)) return res.status(403).json({ error: "forbidden" });

    const conflict = await svcFindLibrarianConflict(librarianId, startAt, endAt, excludeId);
    res.json({ conflict: conflict || null });
  }) as RequestHandler
);

export default r;
