"use strict";
// apps/api/src/routes/consultations/consultations.ts
// O que faz: CRUD + queries de Consultations e Slots, com regras de conflito/estado.
// Estilo: helpers PUROS, serviços curtos e handlers <= 30 linhas.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
const asInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const asDate = (v) => {
    const d = v ? new Date(String(v)) : undefined;
    return d && !isNaN(+d) ? d : undefined;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const safeNotes = (v) => typeof v === "string" ? v.slice(0, 500) : null;
// tiny helpers de autorização (puros)
const isAdmin = (req) => (req.user?.roles || []).includes(auth_1.ROLES.ADMIN);
const isActor = (req, c) => req.user?.id === c.librarianId || req.user?.id === c.familyId;
/* ============================== Services (DB) ============================== */
// Cria consulta: com slot (BOOKED) ou sem slot (pendente).
async function svcCreateConsultation(input) {
    const { familyId, librarianId, childId, libraryId, slotId, mode, location, notes, } = input;
    if (slotId) {
        return prisma.$transaction(async (tx) => {
            const slot = await tx.consultationSlot.findUnique({
                where: { id: slotId },
            });
            if (!slot)
                throw new Error("slot inexistente");
            if (slot.status !== client_1.$Enums.SlotStatus.OPEN)
                throw new Error("slot indisponível");
            if (slot.librarianId !== librarianId)
                throw new Error("slot pertence a outro bibliotecário");
            const c = await tx.consultation.create({
                data: {
                    familyId,
                    librarianId,
                    childId: childId ?? null,
                    libraryId: libraryId ?? null,
                    mode,
                    location,
                    startAt: slot.startAt,
                    endAt: slot.endAt,
                    status: client_1.$Enums.ConsultationStatus.PENDING,
                    slotId,
                    notes,
                    events: { create: [{ type: "REQUESTED" }] },
                },
            });
            await tx.consultationSlot.update({
                where: { id: slotId },
                data: { status: client_1.$Enums.SlotStatus.BOOKED },
            });
            return c;
        });
    }
    return prisma.consultation.create({
        data: {
            familyId,
            librarianId,
            childId: childId ?? null,
            libraryId: libraryId ?? null,
            mode,
            location,
            status: client_1.$Enums.ConsultationStatus.PENDING,
            notes,
            events: { create: [{ type: "REQUESTED" }] },
        },
    });
}
// Lista todas com filtros simples.
async function svcListAllConsultations(q) {
    const where = {};
    if (q.statuses?.length)
        where.status = { in: q.statuses };
    if (q.from || q.to)
        where.startAt = {
            ...(q.from ? { gte: q.from } : {}),
            ...(q.to ? { lte: q.to } : {}),
        };
    if (q.librarianId)
        where.librarianId = q.librarianId;
    if (q.familyId)
        where.familyId = q.familyId;
    if (q.childId)
        where.childId = q.childId;
    return prisma.consultation.findMany({
        where,
        take: q.limit,
        orderBy: [{ startAt: q.order }, { id: "desc" }],
        include: {
            family: { select: { id: true, fullName: true, email: true } },
            librarian: { select: { id: true, fullName: true, email: true } },
            child: { select: { id: true, name: true } },
            library: { select: { id: true, name: true } },
            slot: { select: { id: true, startAt: true, endAt: true, status: true } },
            events: {
                select: { id: true, type: true, at: true, actorId: true },
                orderBy: { at: "desc" },
                take: 5,
            },
        },
    });
}
// Próximas consultas (pend/confirmed) a partir de uma data.
async function svcListNext(q) {
    const where = {
        status: {
            in: [
                client_1.$Enums.ConsultationStatus.PENDING,
                client_1.$Enums.ConsultationStatus.CONFIRMED,
            ],
        },
        startAt: { gte: q.from },
    };
    if (q.familyId)
        where.familyId = q.familyId;
    if (q.librarianId)
        where.librarianId = q.librarianId;
    if (q.childId)
        where.childId = q.childId;
    const items = await prisma.consultation.findMany({
        where,
        take: q.limit,
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
    return items.map((c) => ({
        id: c.id,
        title: c.child?.name
            ? `Consulta de ${c.child.name}`
            : `Consulta com ${c.librarian?.fullName ?? "bibliotecário"}`,
        date: c.startAt?.toISOString(),
        scheduledAt: c.startAt?.toISOString(),
        status: c.status,
        librarianId: c.librarian?.id ?? null,
        librarianName: c.librarian?.fullName ?? undefined,
        familyId: c.family?.id,
        childId: c.child?.id,
        libraryId: c.library?.id ?? undefined,
        libraryName: c.library?.name ?? undefined,
    }));
}
// Lista bibliotecários (roleId=2) e, opcionalmente, da biblioteca X.
async function svcListLibrarians(libraryId) {
    const where = { userRoles: { some: { roleId: 2 } } };
    if (libraryId)
        where.userLibraries = { some: { libraryId } };
    const users = await prisma.user.findMany({
        where,
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
    });
    return users.map((u) => ({ id: u.id, name: u.fullName }));
}
// Lista slots OPEN num intervalo (futuros por defeito quando onlyBookable=true).
async function svcListSlots(q) {
    const now = new Date();
    const where = {
        status: client_1.$Enums.SlotStatus.OPEN,
        startAt: { gte: q.onlyBookable ? (q.from > now ? q.from : now) : q.from },
        endAt: { lte: q.to },
    };
    if (q.librarianId)
        where.librarianId = q.librarianId;
    if (q.libraryId)
        where.libraryId = q.libraryId;
    const items = await prisma.consultationSlot.findMany({
        where,
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
    return items.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        librarianId: s.librarianId,
        librarianName: s.librarian?.fullName ?? null,
        librarianAvatarUrl: null,
        libraryId: s.libraryId ?? undefined,
        libraryName: s.library?.name ?? undefined,
    }));
}
// Bibliotecários que têm slots OPEN num intervalo (e opcionalmente biblioteca X).
async function svcLibrariansWithOpenSlots(from, to, libraryId) {
    const now = new Date();
    const effFrom = from > now ? from : now;
    const users = await prisma.user.findMany({
        where: {
            userRoles: { some: { roleId: 2 } },
            consultationSlots: {
                some: {
                    status: client_1.$Enums.SlotStatus.OPEN,
                    startAt: { gte: effFrom },
                    endAt: { lte: to },
                    ...(libraryId ? { libraryId } : {}),
                },
            },
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
    });
    return users.map((u) => ({ id: u.id, name: u.fullName }));
}
// Confirma consulta, valida conflito e marca slot BOOKED.
async function svcConfirmConsultation(id, req) {
    return prisma.$transaction(async (tx) => {
        const c = await tx.consultation.findUnique({
            where: { id },
            include: { slot: true },
        });
        if (!c)
            throw new Error("not found");
        if (!isAdmin(req) && req.user?.id !== c.librarianId)
            throw new Error("forbidden");
        if (!c.startAt || !c.endAt)
            throw new Error("consulta sem horário para confirmar");
        const conflict = await tx.consultation.findFirst({
            where: {
                librarianId: c.librarianId,
                status: client_1.ConsultationStatus.CONFIRMED,
                startAt: { lt: c.endAt },
                endAt: { gt: c.startAt },
                id: { not: c.id },
            },
            select: { id: true, startAt: true, endAt: true, familyId: true },
        });
        if (conflict)
            return { error: "conflict", conflict };
        if (c.slotId) {
            await tx.consultationSlot.update({
                where: { id: c.slotId },
                data: { status: client_1.$Enums.SlotStatus.BOOKED },
            });
        }
        return tx.consultation.update({
            where: { id: c.id },
            data: {
                status: client_1.ConsultationStatus.CONFIRMED,
                events: { create: { type: "CONFIRMED", actorId: req.user?.id } },
            },
        });
    });
}
// Declina consulta e reabre slot se existir.
async function svcDeclineConsultation(id) {
    const c = await prisma.consultation.update({
        where: { id },
        data: { status: "DECLINED", events: { create: { type: "DECLINED" } } },
    });
    if (c.slotId) {
        await prisma.consultationSlot.update({
            where: { id: c.slotId },
            data: { status: client_1.$Enums.SlotStatus.OPEN },
        });
    }
    return c;
}
// Cancela consulta (autorização + libertar slot + expirar propostas + evento).
async function svcCancelConsultation(id, req, reason) {
    class ApiError extends Error {
        constructor(code, msg) {
            super(msg);
            this.code = code;
        }
    }
    await prisma.$transaction(async (tx) => {
        const c = await tx.consultation.findUnique({
            where: { id },
            include: { slot: true },
        });
        if (!c)
            throw new ApiError(404, "not_found");
        if (!isAdmin(req) && !isActor(req, c))
            throw new ApiError(403, "forbidden");
        if (c.status === client_1.$Enums.ConsultationStatus.CANCELLED)
            throw new ApiError(409, "already_cancelled");
        if (c.status === client_1.$Enums.ConsultationStatus.COMPLETED)
            throw new ApiError(409, "completed");
        if (c.status === client_1.$Enums.ConsultationStatus.DECLINED)
            throw new ApiError(409, "invalid_state");
        if (c.slotId)
            await tx.consultationSlot.update({
                where: { id: c.slotId },
                data: { status: client_1.$Enums.SlotStatus.OPEN },
            });
        await tx.consultation.update({
            where: { id: c.id },
            data: { status: client_1.$Enums.ConsultationStatus.CANCELLED, slotId: null },
        });
        await tx.consultationProposal.updateMany({
            where: { consultationId: c.id, status: client_1.$Enums.ProposalStatus.PENDING },
            data: { status: client_1.$Enums.ProposalStatus.EXPIRED, decidedAt: new Date() },
        });
        await tx.consultationEvent.create({
            data: {
                consultationId: c.id,
                type: "CONSULTATION_CANCELLED",
                actorId: req.user?.id ?? null,
                payload: { reason },
            },
        });
    });
}
// Completa consulta (+ evento).
const svcComplete = (id) => prisma.consultation.update({
    where: { id },
    data: { status: "COMPLETED", events: { create: { type: "COMPLETED" } } },
});
// Detalhe por id (saída enxuta).
async function svcGetById(id) {
    const c = await prisma.consultation.findUnique({
        where: { id },
        include: {
            family: { select: { id: true, fullName: true } },
            librarian: { select: { id: true, fullName: true } },
            child: { select: { id: true, name: true } },
            library: { select: { id: true, name: true } },
            slot: { select: { id: true, startAt: true, endAt: true, status: true } },
        },
    });
    if (!c)
        return null;
    return {
        id: c.id,
        status: c.status,
        startAt: c.startAt,
        endAt: c.endAt,
        familyId: c.familyId,
        childId: c.childId,
        librarianId: c.librarianId,
        libraryId: c.libraryId,
    };
}
/* ============================== Handlers (<= 30 linhas) ============================== */
// POST /api/consultations (com/sem slot) — aceita notes
r.post("/", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    try {
        const familyId = asInt(req.body?.familyId);
        const librarianId = asInt(req.body?.librarianId);
        if (!familyId || !librarianId)
            return res
                .status(400)
                .json({ error: "familyId e librarianId obrigatórios" });
        const out = await svcCreateConsultation({
            familyId,
            librarianId,
            childId: asInt(req.body?.childId),
            libraryId: asInt(req.body?.libraryId),
            slotId: asInt(req.body?.slotId),
            mode: req.body?.mode,
            location: req.body?.location,
            notes: safeNotes(req.body?.notes),
        });
        res.json(out);
    }
    catch (e) {
        res
            .status(400)
            .json({ error: e?.message ?? "failed to create consultation" });
    }
});
// GET /api/consultations/all
r.get("/all", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    try {
        const limit = clamp(Number(req.query.limit ?? 50), 1, 200);
        const statuses = String(req.query.status || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const items = await svcListAllConsultations({
            limit,
            statuses,
            order: req.query.order === "desc" ? "desc" : "asc",
            from: asDate(req.query.from),
            to: asDate(req.query.to),
            librarianId: asInt(req.query.librarianId),
            familyId: asInt(req.query.familyId),
            childId: asInt(req.query.childId),
        });
        res.json(items);
    }
    catch (e) {
        res
            .status(400)
            .json({ error: e?.message ?? "failed to list consultations" });
    }
});
// GET /api/consultations/next
r.get("/next", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    const limit = clamp(Number(req.query.limit ?? 6), 1, 50);
    const from = asDate(req.query.from) ?? new Date();
    const familyId = asInt(req.query.familyId);
    const librarianId = asInt(req.query.librarianId);
    const childId = asInt(req.query.childId);
    if (!familyId && !librarianId)
        return res
            .status(400)
            .json({ error: "familyId ou librarianId são obrigatórios" });
    try {
        const items = await svcListNext({
            limit,
            from,
            familyId,
            librarianId,
            childId,
        });
        res.json(items);
    }
    catch (e) {
        res
            .status(400)
            .json({ error: e?.message ?? "failed to list next consultations" });
    }
});
// GET /api/consultations/librarians
r.get("/librarians", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    try {
        const libraryId = asInt(req.query.libraryId);
        res.json(await svcListLibrarians(libraryId));
    }
    catch (e) {
        res
            .status(400)
            .json({ error: e?.message ?? "failed to list librarians" });
    }
});
// GET /api/consultations/slots
r.get("/slots", async (req, res) => {
    const from = asDate(req.query.from);
    const to = asDate(req.query.to);
    if (!from || !to)
        return res.status(400).json({ error: "from e to (ISO) são obrigatórios" });
    try {
        const items = await svcListSlots({
            from,
            to,
            onlyBookable: String(req.query.onlyBookable ?? "true") === "true",
            librarianId: asInt(req.query.librarianId),
            libraryId: asInt(req.query.libraryId),
        });
        res.json(items);
    }
    catch (e) {
        res.status(400).json({ error: e?.message ?? "failed to list slots" });
    }
});
// GET /api/consultations/librarians/with-open-slots
r.get("/librarians/with-open-slots", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    const from = asDate(req.query.from);
    const to = asDate(req.query.to);
    if (!from || !to)
        return res
            .status(400)
            .json({ error: "from e to (ISO) são obrigatórios" });
    try {
        res.json(await svcLibrariansWithOpenSlots(from, to, asInt(req.query.libraryId)));
    }
    catch (e) {
        res
            .status(400)
            .json({
            error: e?.message ?? "failed to list librarians with open slots",
        });
    }
});
// POST /api/consultations/:id/confirm
r.post("/:id/confirm", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    const id = asInt(req.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    try {
        const result = await svcConfirmConsultation(id, req);
        if (result?.error === "conflict")
            return res.status(409).json(result);
        return res.json(result);
    }
    catch (e) {
        const msg = String(e?.message || "");
        if (msg === "forbidden")
            return res.status(403).json({ error: "forbidden" });
        if (msg === "not found")
            return res.status(404).json({ error: "not found" });
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
            return res.status(409).json({ error: "concurrency" });
        return res.status(400).json({ error: "failed to confirm" });
    }
});
// POST /api/consultations/:id/decline
r.post("/:id/decline", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    const id = asInt(req.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    try {
        res.json(await svcDeclineConsultation(id));
    }
    catch (e) {
        res.status(400).json({ error: e?.message ?? "failed to decline" });
    }
});
// POST /api/consultations/:id/cancel  → 204
r.post("/:id/cancel", auth_1.withUser, async (req, res) => {
    const id = asInt(req.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    try {
        await svcCancelConsultation(id, req, req.body?.reason);
        res.status(204).end();
    }
    catch (e) {
        if (e?.code && e?.message)
            return res.status(e.code).json({ error: e.message });
        const msg = String(e?.message || "");
        if (/unique|constraint|slotId|startAt.*endAt/i.test(msg))
            return res.status(409).json({ error: "concurrency" });
        res.status(400).json({ error: e?.message ?? "error" });
    }
});
// POST /api/consultations/:id/complete
r.post("/:id/complete", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    const id = asInt(req.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    res.json(await svcComplete(id));
});
// GET /api/consultations/:id
r.get("/:id", auth_1.withUser, auth_1.requireFamilyOrLibrarian, async (req, res) => {
    const id = asInt(req.params.id);
    if (!id)
        return res.status(400).json({ error: "invalid_id" });
    const out = await svcGetById(id);
    if (!out)
        return res.status(404).json({ error: "not_found" });
    res.json(out);
});
exports.default = r;
