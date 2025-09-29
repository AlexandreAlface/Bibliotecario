"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
// Utilitário: conflito do bibliotecário em [start,end)
async function findLibrarianConflict(librarianId, startAt, endAt, excludeConsultationId) {
    return prisma.consultation.findFirst({
        where: {
            librarianId,
            status: client_1.ConsultationStatus.CONFIRMED,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            ...(excludeConsultationId ? { id: { not: excludeConsultationId } } : {}),
        },
        select: { id: true, startAt: true, endAt: true, familyId: true },
    });
}
r.post("/consultations/:id/cancel", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), async (req, res) => {
    const id = Number(req.params.id);
    const reason = req.body?.reason;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const c = await tx.consultation.findUnique({
                where: { id },
                include: { slot: true },
            });
            if (!c)
                return res.status(404).json({ error: "not_found" });
            // autorização: admin ou intervenientes
            const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
            const isLibrarian = req.user?.id === c.librarianId;
            const isFamily = req.user?.id === c.familyId;
            if (!isAdmin && !isLibrarian && !isFamily) {
                return res.status(403).json({ error: "forbidden" });
            }
            // estados permitidos
            if (c.status === client_1.ConsultationStatus.CANCELLED) {
                return res.status(409).json({ error: "already_cancelled" });
            }
            if (c.status === client_1.ConsultationStatus.COMPLETED) {
                return res.status(409).json({ error: "completed" });
            }
            if (c.status === client_1.ConsultationStatus.DECLINED) {
                return res.status(409).json({ error: "invalid_state" });
            }
            // libertar slot se existir
            if (c.slotId) {
                await tx.consultationSlot.update({
                    where: { id: c.slotId },
                    data: { status: client_1.SlotStatus.OPEN },
                });
            }
            // cancelar consulta (desassociar slot para voltar a poder ser usado)
            const updated = await tx.consultation.update({
                where: { id: c.id },
                data: {
                    status: client_1.ConsultationStatus.CANCELLED,
                    slotId: null, // 👈 importante para não “prender” o slot
                },
            });
            // expirar propostas pendentes
            const now = new Date();
            await tx.consultationProposal.updateMany({
                where: { consultationId: c.id, status: client_1.ProposalStatus.PENDING },
                data: { status: client_1.ProposalStatus.EXPIRED, decidedAt: now },
            });
            // evento
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
        // se algum dos returns de erro acima aconteceu, já devolvemos resposta
        if (res.headersSent)
            return;
        res.json(result);
    }
    catch (e) {
        const msg = String(e?.message || "");
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) {
            return res.status(409).json({ error: "concurrency" });
        }
        console.error(e);
        res.status(400).json({ error: e?.message ?? "error" });
    }
});
// POST /api/v1/consultations/:id/proposals  (retoques: validação leve)
r.post("/:id/proposals", auth_1.withUser, async (req, res) => {
    const id = Number(req.params.id);
    const { proposedBy = client_1.ProposalActor.LIBRARIAN, toStartAt, toEndAt, message, } = req.body;
    const c = await prisma.consultation.findUnique({ where: { id } });
    if (!c)
        return res.status(404).json({ error: "not_found" });
    // não permitir propor em consultas canceladas/completadas
    if (c.status === client_1.ConsultationStatus.CANCELLED ||
        c.status === client_1.ConsultationStatus.COMPLETED) {
        return res.status(409).json({ error: "invalid_state" });
    }
    const start = new Date(toStartAt);
    const end = new Date(toEndAt);
    if (isNaN(+start) || isNaN(+end) || !(start < end)) {
        return res.status(400).json({ error: "invalid_dates" });
    }
    // Existe proposta PENDENTE para esta consulta?
    const existing = await prisma.consultationProposal.findFirst({
        where: { consultationId: id, status: client_1.ProposalStatus.PENDING },
    });
    if (existing) {
        // Se a proposta pendente é de OUTRO ator (ex.: família), não deixamos sobrepor
        if (existing.proposedBy !== proposedBy) {
            return res.status(409).json({ error: "pending_proposal_other_actor" });
        }
        // Se os horários são iguais aos já propostos, devolvemos a mesma (idempotente)
        const same = +existing.toStartAt === +start && +existing.toEndAt === +end;
        if (same)
            return res.json(existing);
        // Atualiza a proposta pendente do MESMO ator
        const prevToStartAt = existing.toStartAt;
        const prevToEndAt = existing.toEndAt;
        const upd = await prisma.consultationProposal.update({
            where: { id: existing.id },
            data: {
                // mantém fromStart/EndAt (originais) se já existirem; senão fixa com o horário atual da consulta
                fromStartAt: existing.fromStartAt ?? c.startAt ?? null,
                fromEndAt: existing.fromEndAt ?? c.endAt ?? null,
                toStartAt: start,
                toEndAt: end,
                message: message ?? existing.message,
                // continua PENDING
            },
        });
        await prisma.consultationEvent.create({
            data: {
                consultationId: id,
                type: "RESCHEDULE_PROPOSED_UPDATED",
                actorId: req.user?.id ?? null,
                payload: {
                    proposalId: existing.id,
                    prevToStartAt,
                    prevToEndAt,
                },
            },
        });
        return res.json(upd);
    }
    // Não havia PENDING → cria nova proposta
    const p = await prisma.consultationProposal.create({
        data: {
            consultationId: id,
            proposedBy,
            fromStartAt: c.startAt ?? null,
            fromEndAt: c.endAt ?? null,
            toStartAt: start,
            toEndAt: end,
            message: message ?? null,
            status: client_1.ProposalStatus.PENDING,
        },
    });
    await prisma.consultationEvent.create({
        data: {
            consultationId: id,
            type: "RESCHEDULE_PROPOSED",
            actorId: req.user?.id ?? null,
            payload: { proposalId: p.id },
        },
    });
    res.json(p);
});
r.get("/librarians/:librarianId/proposals", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    const librarianId = Number(req.params.librarianId);
    const statusParam = String(req.query.status || "PENDING").toUpperCase();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
    if (!isAdmin && req.user?.id !== librarianId) {
        return res.status(403).json({ error: "forbidden" });
    }
    // ✅ converte string -> enum (ou ignora se inválido)
    const statusEnum = Object.values(client_1.ProposalStatus).includes(statusParam)
        ? statusParam
        : undefined;
    // ✅ relation filter correto + enum tipado
    const where = {
        ...(statusEnum ? { status: statusEnum } : {}),
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
        prisma.consultationProposal.count({ where }), // ✅ mesmo where tipado
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
            consultation: p.consultation, // ✅ existe porque fizemos include
        })),
    });
});
// POST /api/v1/proposals/:proposalId/accept  ✅ versão com conflitos + estados
r.post("/proposals/:proposalId/accept", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), async (req, res) => {
    const proposalId = Number(req.params.proposalId);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const p = await tx.consultationProposal.findUnique({
                where: { id: proposalId },
                include: { consultation: true },
            });
            if (!p || p.status !== client_1.ProposalStatus.PENDING) {
                throw new Error("invalid proposal");
            }
            const c = p.consultation;
            const proposer = p.proposedBy;
            const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
            const isLibrarian = req.user?.id === c.librarianId;
            const isFamily = req.user?.id === c.familyId;
            // 🔐 Regras de autorização:
            // - Se a proposta foi feita pelo BIBLIOTECÁRIO → só a FAMÍLIA (ou ADMIN) pode aceitar.
            // - Se a proposta foi feita pela FAMÍLIA → só o BIBLIOTECÁRIO (ou ADMIN) pode aceitar.
            // - Se foi SYSTEM → ambas as partes (ou ADMIN) podem aceitar.
            let allowed = false;
            if (isAdmin) {
                allowed = true;
            }
            else if (proposer === client_1.ProposalActor.LIBRARIAN) {
                allowed = isFamily;
            }
            else if (proposer === client_1.ProposalActor.FAMILY) {
                allowed = isLibrarian;
            }
            else {
                // SYSTEM
                allowed = isLibrarian || isFamily;
            }
            if (!allowed) {
                return res.status(403).json({ error: "forbidden" });
            }
            const startAt = new Date(p.toStartAt);
            const endAt = new Date(p.toEndAt);
            // 🚦 Conflito com outras CONFIRMED do bibliotecário
            const conflict = await findLibrarianConflict(c.librarianId, startAt, endAt, c.id);
            if (conflict) {
                return res.status(409).json({ error: "conflict", conflict });
            }
            // 🔓 Libertar slot anterior (se existir)
            if (c.slotId) {
                await tx.consultationSlot.update({
                    where: { id: c.slotId },
                    data: { status: client_1.SlotStatus.OPEN },
                });
            }
            // ✅ Garantir slot para o novo intervalo
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
            if (slot.status !== client_1.SlotStatus.OPEN) {
                return res
                    .status(409)
                    .json({ error: "slot not open", slotStatus: slot.status });
            }
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
    }
    catch (e) {
        const msg = String(e?.message || "");
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg)) {
            return res.status(409).json({ error: "concurrency" });
        }
        console.error(e);
        res.status(400).json({ error: e?.message ?? "error" });
    }
});
// POST /api/v1/proposals/:proposalId/decline  (retoque: decidedBy)
r.post("/proposals/:proposalId/decline", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN, auth_1.ROLES.FAMILY), // ⬅️ família também pode recusar
async (req, res) => {
    const proposalId = Number(req.params.proposalId);
    const p = await prisma.consultationProposal.findUnique({
        where: { id: proposalId },
        include: { consultation: true },
    });
    if (!p)
        return res.status(404).json({ error: "not found" });
    const c = p.consultation;
    const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
    const isLibrarian = req.user?.id === c.librarianId;
    const isFamily = req.user?.id === c.familyId;
    if (!isAdmin && !isLibrarian && !isFamily) {
        return res.status(403).json({ error: "forbidden" });
    }
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
    res.json(upd);
});
// LISTAR PROPOSTAS DO BIBLIOTECÁRIO (pendentes por omissão)
// GET /api/v1/librarians/:librarianId/proposals?status=PENDING&page=1&limit=20
r.get("/families/:familyId/proposals", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.FAMILY, auth_1.ROLES.ADMIN), async (req, res) => {
    const familyId = Number(req.params.familyId);
    const statusParam = String(req.query.status || "PENDING").toUpperCase();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
    if (!isAdmin && req.user?.id !== familyId) {
        return res.status(403).json({ error: "forbidden" });
    }
    const statusEnum = Object.values(client_1.ProposalStatus).includes(statusParam)
        ? statusParam
        : undefined;
    const where = {
        ...(statusEnum ? { status: statusEnum } : {}),
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
});
// PRÉ-CHECK DE CONFLITO POR INTERVALO
// GET /api/v1/librarians/:librarianId/conflicts?startAt=...&endAt=...&excludeConsultationId=123
r.get("/librarians/:librarianId/conflicts", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    const librarianId = Number(req.params.librarianId);
    const startAt = new Date(String(req.query.startAt));
    const endAt = new Date(String(req.query.endAt));
    const excludeConsultationId = req.query.excludeConsultationId
        ? Number(req.query.excludeConsultationId)
        : undefined;
    const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
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
});
exports.default = r;
