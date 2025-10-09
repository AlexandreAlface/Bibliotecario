"use strict";
// apps/api/src/routes/consultations/slots.ts
// O que faz: gestão de slots (listar, criar em bulk, alterar estado) e utilidades
// Estilo: helpers PUROS → serviços curtos (DB) → handlers Express (≤ 30 linhas)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
// Interseção temporal de [a,b] com [c,d] — Puro
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
// Normalizadores simples — Puros
const asInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const asDate = (v) => {
    const d = v ? new Date(String(v)) : undefined;
    return d && !isNaN(+d) ? d : undefined;
};
const isFiniteNum = (n) => Number.isFinite(Number(n));
// Valida “status” vindo do corpo — Puro
const parseStatus = (v) => v === client_1.SlotStatus.OPEN || v === client_1.SlotStatus.BLOCKED ? v : null;
/* ============================== Serviços (DB) ============================== */
// Lista slots de um bibliotecário que INTERSETAM [from,to] e mapeia saída para o front.
async function svcListLibrarianSlots(librarianId, from, to) {
    const slots = await prisma.consultationSlot.findMany({
        where: { librarianId, startAt: { lt: to }, endAt: { gt: from } },
        select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            library: { select: { id: true, name: true } },
            librarian: { select: { id: true, fullName: true } },
            consultation: {
                select: {
                    id: true,
                    family: { select: { fullName: true } },
                    child: { select: { name: true } },
                },
            },
        },
        orderBy: [{ startAt: "asc" }, { endAt: "asc" }],
    });
    return slots.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        libraryId: s.library?.id ?? null,
        libraryName: s.library?.name ?? null,
        librarianId: s.librarian?.id ?? librarianId,
        librarianName: s.librarian?.fullName ?? null,
        reservedByName: s.consultation?.family?.fullName ?? null,
        reservedChildName: s.consultation?.child?.name ?? null,
    }));
}
// Criação em bulk de slots, com auto-detecção de “bloqueios” por LibraryBlock.
async function svcBulkCreateSlots(librarianId, bodySlots) {
    // bibliotecas às quais o bibliotecário pertence (para default de libraryId)
    const links = await prisma.userLibrary.findMany({
        where: { userId: librarianId },
        select: { libraryId: true },
    });
    const onlyOneLibrary = links.length === 1 ? links[0].libraryId : null;
    // Resolver/validar cada item do corpo
    const resolved = bodySlots.map((s) => {
        const startAt = new Date(s.startAt);
        const endAt = new Date(s.endAt);
        const libId = s.libraryId != null ? Number(s.libraryId) : onlyOneLibrary;
        if (!isFiniteNum(libId)) {
            throw new Error("libraryId é obrigatório quando o bibliotecário pertence a várias bibliotecas");
        }
        return {
            librarianId,
            libraryId: libId,
            startAt,
            endAt,
            status: s.status ?? client_1.SlotStatus.OPEN,
        };
    });
    if (!resolved.length)
        return { created: 0, skipped: 0, blockedAuto: 0 };
    // Agregar intervalo e bibliotecas para um fetch de bloqueios
    const minStart = new Date(Math.min(...resolved.map((s) => +s.startAt)));
    const maxEnd = new Date(Math.max(...resolved.map((s) => +s.endAt)));
    const libs = Array.from(new Set(resolved.map((s) => s.libraryId)));
    // Bloqueios que colidem com QUALQUER slot pretendido
    const blocks = await prisma.libraryBlock.findMany({
        where: {
            libraryId: { in: libs },
            startAt: { lt: maxEnd },
            endAt: { gt: minStart },
        },
        select: { id: true, libraryId: true, startAt: true, endAt: true },
    });
    // Marcar automaticamente como BLOCKED se colidir com um bloqueio
    let blockedAuto = 0;
    const toCreate = resolved.map((s) => {
        const hit = blocks.find((b) => b.libraryId === s.libraryId &&
            overlaps(s.startAt, s.endAt, b.startAt, b.endAt));
        if (hit) {
            blockedAuto++;
            return {
                ...s,
                status: client_1.SlotStatus.BLOCKED,
                blockedByLibraryBlockId: hit.id,
            };
        }
        return s;
    });
    // Criar em bulk (skipDuplicates para não rebentar com colisões de unique)
    const created = await prisma.consultationSlot.createMany({
        data: toCreate,
        skipDuplicates: true,
    });
    const skipped = toCreate.length - created.count;
    return { created: created.count, skipped, blockedAuto };
}
// Atualiza o estado de um slot (OPEN | BLOCKED)
async function svcUpdateSlotStatus(id, status) {
    return prisma.consultationSlot.update({ where: { id }, data: { status } });
}
// Lista slots OPEN em [from,to] (filtros opcionais de bibliotecário/biblioteca)
async function svcListOpenSlots(from, to, librarianId, libraryId) {
    const items = await prisma.consultationSlot.findMany({
        where: {
            status: client_1.SlotStatus.OPEN,
            startAt: { gte: from },
            endAt: { lte: to },
            ...(librarianId ? { librarianId } : {}),
            ...(libraryId ? { libraryId } : {}),
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
    return items.map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        librarianId: s.librarianId,
        librarianName: s.librarian?.fullName,
        librarianAvatarUrl: null, // se adicionares avatarUrl, devolve-o aqui
        libraryId: s.libraryId ?? undefined,
        libraryName: s.library?.name ?? undefined,
    }));
}
// Lista bibliotecas de um bibliotecário (com autorização simples)
async function svcListLibrarianLibraries(librarianId, req) {
    const admin = (req.user?.roles || []).includes(auth_1.ROLES.ADMIN);
    if (!admin && req.user?.id !== librarianId)
        throw new Error("forbidden");
    const links = await prisma.userLibrary.findMany({
        where: { userId: librarianId },
        select: { library: { select: { id: true, name: true } } },
        orderBy: { libraryId: "asc" },
    });
    return links.map((l) => l.library).filter(Boolean);
}
/* ============================== Handlers (≤ 30 linhas) ============================== */
// GET /api/consultations/librarians/:librarianId/slots?from=...&to=...
r.get("/librarians/:librarianId/slots", async (req, res) => {
    try {
        const librarianId = asInt(req.params.librarianId);
        const from = asDate(req.query.from);
        const to = asDate(req.query.to);
        if (!librarianId || !from || !to)
            return res
                .status(400)
                .json({ error: "librarianId, from e to são obrigatórios" });
        res.json(await svcListLibrarianSlots(librarianId, from, to));
    }
    catch (e) {
        console.error(e);
        res
            .status(400)
            .json({ error: e?.message ?? "failed to list librarian slots" });
    }
});
// POST /api/consultations/librarians/:librarianId/slots/bulk
r.post("/librarians/:librarianId/slots/bulk", (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    try {
        const librarianId = asInt(req.params.librarianId);
        const bodySlots = (Array.isArray(req.body?.slots) ? req.body.slots : []);
        if (!librarianId)
            return res.status(400).json({ error: "invalid librarianId" });
        const result = await svcBulkCreateSlots(librarianId, bodySlots);
        res.json(result);
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to bulk create" });
    }
});
// PATCH /api/consultations/slots/:id  body: { status: 'OPEN' | 'BLOCKED' }
r.patch("/slots/:id", (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    try {
        const id = asInt(req.params.id);
        const status = parseStatus(req.body?.status);
        if (!id)
            return res.status(400).json({ error: "invalid id" });
        if (!status)
            return res.status(400).json({ error: "invalid status" });
        const slot = await svcUpdateSlotStatus(id, status);
        res.json(slot);
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to update slot" });
    }
});
/**
 * GET /api/consultations/slots?from&to&libraryId&librarianId
 * Devolve slots OPEN no intervalo indicado (com nome do bibliotecário e da biblioteca)
 */
r.get("/slots", async (req, res) => {
    try {
        const from = asDate(req.query.from);
        const to = asDate(req.query.to);
        if (!from || !to)
            return res
                .status(400)
                .json({ error: "from e to (ISO) são obrigatórios" });
        const librarianId = asInt(req.query.librarianId);
        const libraryId = asInt(req.query.libraryId);
        res.json(await svcListOpenSlots(from, to, librarianId, libraryId));
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to list slots" });
    }
});
// GET /api/consultations/librarians/:librarianId/libraries
r.get("/librarians/:librarianId/libraries", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    try {
        const librarianId = asInt(req.params.librarianId);
        if (!librarianId)
            return res.status(400).json({ error: "invalid librarianId" });
        const libs = await svcListLibrarianLibraries(librarianId, req);
        res.json(libs);
    }
    catch (e) {
        console.error(e);
        const msg = String(e?.message || "");
        if (msg === "forbidden")
            return res.status(403).json({ error: "forbidden" });
        res.status(400).json({ error: e?.message ?? "failed to list libraries" });
    }
});
exports.default = r;
