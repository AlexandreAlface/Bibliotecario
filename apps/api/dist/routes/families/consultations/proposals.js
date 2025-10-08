"use strict";
// apps/api/src/routes/families/consultations/proposals.ts
// O que faz: cancelar consulta, propor/aceitar/recusar reagendamentos,
// listar propostas (por bibliotecário/família) e pré-check de conflitos.
// Estilo: helpers PUROS → serviços curtos (DB) → handlers Express (≤ 30 linhas)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
class ApiError extends Error {
    constructor(code, message, payload) {
        super(message);
        this.code = code;
        this.payload = payload;
    }
}
const asInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const asDate = (v) => {
    const d = v ? new Date(String(v)) : undefined;
    return d && !isNaN(+d) ? d : undefined;
};
const isAdmin = (req) => (req.user?.roles || []).includes(auth_1.ROLES.ADMIN);
const isActorFamily = (req, familyId) => req.user?.id === familyId;
const isActorLibrarian = (req, librarianId) => req.user?.id === librarianId;
const parseProposalStatus = (s) => {
    const up = String(s || "").toUpperCase();
    return Object.values(client_1.ProposalStatus).includes(up)
        ? up
        : undefined;
};
/* ============================== Serviços (DB) ============================== */
// Conflito do bibliotecário em [start,end)
async function svcFindLibrarianConflict(librarianId, startAt, endAt, excludeId, db = prisma) {
    return db.consultation.findFirst({
        where: {
            librarianId,
            status: client_1.ConsultationStatus.CONFIRMED,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, startAt: true, endAt: true, familyId: true },
    });
}
// Cancelar consulta (autorizações + libertar slot + expirar propostas + evento)
async function svcCancelConsultation(id, req, reason) {
    return prisma.$transaction(async (tx) => {
        const c = await tx.consultation.findUnique({
            where: { id },
            include: { slot: true },
        });
        if (!c)
            throw new ApiError(404, "not_found");
        const allowed = isAdmin(req) ||
            isActorLibrarian(req, c.librarianId) ||
            isActorFamily(req, c.familyId);
        if (!allowed)
            throw new ApiError(403, "forbidden");
        if (c.status === client_1.ConsultationStatus.CANCELLED)
            throw new ApiError(409, "already_cancelled");
        if (c.status === client_1.ConsultationStatus.COMPLETED)
            throw new ApiError(409, "completed");
        if (c.status === client_1.ConsultationStatus.DECLINED)
            throw new ApiError(409, "invalid_state");
        if (c.slotId)
            await tx.consultationSlot.update({
                where: { id: c.slotId },
                data: { status: client_1.SlotStatus.OPEN },
            });
        const updated = await tx.consultation.update({
            where: { id: c.id },
            data: { status: client_1.ConsultationStatus.CANCELLED, slotId: null },
        });
        const now = new Date();
        await tx.consultationProposal.updateMany({
            where: { consultationId: c.id, status: client_1.ProposalStatus.PENDING },
            data: { status: client_1.ProposalStatus.EXPIRED, decidedAt: now },
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
async function svcUpsertProposal(consultationId, proposedBy, toStartAt, toEndAt, message, actorId) {
    const c = await prisma.consultation.findUnique({
        where: { id: consultationId },
    });
    if (!c)
        throw new ApiError(404, "not_found");
    // ⚠️ Fix TS: comparar com || evita o erro de includes() com enum
    if (c.status === client_1.ConsultationStatus.CANCELLED ||
        c.status === client_1.ConsultationStatus.COMPLETED) {
        throw new ApiError(409, "invalid_state");
    }
    if (isNaN(+toStartAt) || isNaN(+toEndAt) || !(toStartAt < toEndAt)) {
        throw new ApiError(400, "invalid_dates");
    }
    const existing = await prisma.consultationProposal.findFirst({
        where: { consultationId, status: client_1.ProposalStatus.PENDING },
    });
    if (existing) {
        if (existing.proposedBy !== proposedBy)
            throw new ApiError(409, "pending_proposal_other_actor");
        if (+existing.toStartAt === +toStartAt && +existing.toEndAt === +toEndAt)
            return existing;
        const prev = {
            prevToStartAt: existing.toStartAt,
            prevToEndAt: existing.toEndAt,
        };
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
            status: client_1.ProposalStatus.PENDING,
        },
    });
    await prisma.consultationEvent.create({
        data: {
            consultationId,
            type: "RESCHEDULE_PROPOSED",
            actorId,
            payload: { proposalId: p.id },
        },
    });
    return p;
}
// Aceitar proposta (autorização por ator; conflito; reservar slot; atualizar estados)
async function svcAcceptProposal(proposalId, req) {
    return prisma.$transaction(async (tx) => {
        const p = await tx.consultationProposal.findUnique({
            where: { id: proposalId },
            include: { consultation: true },
        });
        if (!p || p.status !== client_1.ProposalStatus.PENDING)
            throw new ApiError(400, "invalid proposal");
        const c = p.consultation;
        const admin = isAdmin(req);
        const isLib = isActorLibrarian(req, c.librarianId);
        const isFam = isActorFamily(req, c.familyId);
        // Regras: LIBRARIAN propõe → FAMÍLIA aceita; FAMILY propõe → LIBRARIAN aceita; SYSTEM → ambos
        const allowed = admin ||
            (p.proposedBy === client_1.ProposalActor.LIBRARIAN && isFam) ||
            (p.proposedBy === client_1.ProposalActor.FAMILY && isLib) ||
            (p.proposedBy === client_1.ProposalActor.SYSTEM && (isLib || isFam));
        if (!allowed)
            throw new ApiError(403, "forbidden");
        const startAt = new Date(p.toStartAt);
        const endAt = new Date(p.toEndAt);
        // ✅ usar o MESMO client (tx) no check de conflitos
        const conflict = await svcFindLibrarianConflict(c.librarianId, startAt, endAt, c.id, tx);
        if (conflict)
            throw new ApiError(409, "conflict", { conflict });
        if (c.slotId) {
            await tx.consultationSlot.update({
                where: { id: c.slotId },
                data: { status: client_1.SlotStatus.OPEN },
            });
        }
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
                    status: client_1.SlotStatus.OPEN,
                },
            });
        }
        if (slot.status !== client_1.SlotStatus.OPEN)
            throw new ApiError(409, "slot not open", { slotStatus: slot.status });
        await tx.consultationSlot.update({
            where: { id: slot.id },
            data: { status: client_1.SlotStatus.BOOKED },
        });
        const updated = await tx.consultation.update({
            where: { id: c.id },
            data: {
                status: client_1.ConsultationStatus.CONFIRMED,
                startAt,
                endAt,
                slot: { connect: { id: slot.id } },
            },
        });
        const now = new Date();
        await tx.consultationProposal.update({
            where: { id: proposalId },
            data: {
                status: client_1.ProposalStatus.ACCEPTED,
                decidedAt: now,
                decidedById: req.user?.id ?? null,
            },
        });
        await tx.consultationProposal.updateMany({
            where: {
                consultationId: c.id,
                id: { not: proposalId },
                status: client_1.ProposalStatus.PENDING,
            },
            data: { status: client_1.ProposalStatus.EXPIRED, decidedAt: now },
        });
        // ❌ antes: prisma.consultationEvent.create (fora da transação)
        // ✅ agora: usa o tx (não deixa a transação ociosa)
        await tx.consultationEvent.create({
            data: {
                consultationId: c.id,
                type: "RESCHEDULE_ACCEPTED",
                actorId: req.user?.id,
                payload: { proposalId },
            },
        });
        return updated;
    } /*, { timeout: 15000, maxWait: 5000 } opcional */);
}
// Rejeitar proposta (marca DECLINED + evento)
async function svcDeclineProposal(proposalId, req) {
    const p = await prisma.consultationProposal.findUnique({
        where: { id: proposalId },
        include: { consultation: true },
    });
    if (!p)
        throw new ApiError(404, "not found");
    const c = p.consultation;
    const allowed = isAdmin(req) ||
        isActorLibrarian(req, c.librarianId) ||
        isActorFamily(req, c.familyId);
    if (!allowed)
        throw new ApiError(403, "forbidden");
    const upd = await prisma.consultationProposal.update({
        where: { id: proposalId },
        data: {
            status: client_1.ProposalStatus.DECLINED,
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
    return upd;
}
// Listar propostas do bibliotecário (paginado, status opcional)
async function svcListProposalsForLibrarian(librarianId, status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
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
async function svcListProposalsForFamily(familyId, status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
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
r.post("/consultations/:id/cancel", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), (async (req, res) => {
    const aReq = req;
    const id = asInt(aReq.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    try {
        const out = await svcCancelConsultation(id, aReq, aReq.body?.reason);
        res.json(out);
    }
    catch (e) {
        if (e instanceof ApiError)
            return res
                .status(e.code)
                .json({
                error: e.message,
                ...(e.payload ? { payload: e.payload } : {}),
            });
        const msg = String(e?.message || "");
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
            return res.status(409).json({ error: "concurrency" });
        res.status(400).json({ error: e?.message ?? "error" });
    }
}));
// POST /api/v1/consultations/:id/proposals  (cria/atualiza PENDING do mesmo ator)
r.post("/:id/proposals", auth_1.withUser, (async (req, res) => {
    const aReq = req;
    const id = asInt(aReq.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    try {
        const proposedBy = aReq.body?.proposedBy ?? client_1.ProposalActor.LIBRARIAN;
        const start = asDate(aReq.body?.toStartAt);
        const end = asDate(aReq.body?.toEndAt);
        if (!start || !end)
            return res.status(400).json({ error: "invalid_dates" });
        const p = await svcUpsertProposal(id, proposedBy, start, end, aReq.body?.message ?? null, aReq.user?.id ?? null);
        res.json(p);
    }
    catch (e) {
        if (e instanceof ApiError)
            return res.status(e.code).json({ error: e.message });
        res.status(400).json({ error: e?.message ?? "error" });
    }
}));
// GET /api/v1/librarians/:librarianId/proposals
r.get("/librarians/:librarianId/proposals", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), (async (req, res) => {
    const aReq = req;
    const librarianId = asInt(aReq.params.librarianId);
    if (!librarianId)
        return res.status(400).json({ error: "invalid_id" });
    const admin = isAdmin(aReq);
    if (!admin && !isActorLibrarian(aReq, librarianId))
        return res.status(403).json({ error: "forbidden" });
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
            consultation: p.consultation,
        })),
    });
}));
// POST /api/v1/proposals/:proposalId/accept
r.post("/proposals/:proposalId/accept", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), (async (req, res) => {
    const aReq = req;
    const proposalId = asInt(aReq.params.proposalId);
    if (!proposalId)
        return res.status(400).json({ error: "invalid_id" });
    try {
        const out = await svcAcceptProposal(proposalId, aReq);
        res.json(out);
    }
    catch (e) {
        if (e instanceof ApiError)
            return res
                .status(e.code)
                .json({
                error: e.message,
                ...(e.payload ? { payload: e.payload } : {}),
            });
        const msg = String(e?.message || "");
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
            return res.status(409).json({ error: "concurrency" });
        res.status(400).json({ error: e?.message ?? "error" });
    }
}));
// POST /api/v1/proposals/:proposalId/decline
r.post("/proposals/:proposalId/decline", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), (async (req, res) => {
    const aReq = req;
    const proposalId = asInt(aReq.params.proposalId);
    if (!proposalId)
        return res.status(400).json({ error: "invalid_id" });
    try {
        const upd = await svcDeclineProposal(proposalId, aReq);
        res.json(upd);
    }
    catch (e) {
        if (e instanceof ApiError)
            return res.status(e.code).json({ error: e.message });
        res.status(400).json({ error: e?.message ?? "error" });
    }
}));
// GET /api/v1/families/:familyId/proposals
r.get("/families/:familyId/proposals", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.FAMILY, auth_1.ROLES.ADMIN), (async (req, res) => {
    const aReq = req;
    const familyId = asInt(aReq.params.familyId);
    if (!familyId)
        return res.status(400).json({ error: "invalid_id" });
    const admin = isAdmin(aReq);
    if (!admin && !isActorFamily(aReq, familyId))
        return res.status(403).json({ error: "forbidden" });
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
            consultation: p.consultation,
        })),
    });
}));
// GET /api/v1/librarians/:librarianId/conflicts?startAt&endAt&excludeConsultationId
r.get("/librarians/:librarianId/conflicts", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), (async (req, res) => {
    const aReq = req;
    const librarianId = asInt(aReq.params.librarianId);
    const startAt = asDate(aReq.query.startAt);
    const endAt = asDate(aReq.query.endAt);
    const excludeId = asInt(aReq.query.excludeConsultationId);
    if (!librarianId)
        return res.status(400).json({ error: "invalid_id" });
    if (!startAt || !endAt || !(startAt < endAt))
        return res.status(400).json({ error: "invalid dates" });
    const admin = isAdmin(aReq);
    if (!admin && !isActorLibrarian(aReq, librarianId))
        return res.status(403).json({ error: "forbidden" });
    const conflict = await svcFindLibrarianConflict(librarianId, startAt, endAt, excludeId);
    res.json({ conflict: conflict || null });
}));
exports.default = r;
