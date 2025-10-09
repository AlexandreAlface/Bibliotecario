"use strict";
/**
 * Admin — gestão de bloqueios por biblioteca (LibraryBlock).
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Rotas mantidas; código limpo com helpers e comentários. Handlers ≤ 30 linhas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middlewares/auth");
const client_1 = require("@prisma/client");
const r = (0, express_1.Router)();
/* ========================= Helpers puros (sem efeitos) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Converte e valida um ID positivo. — Alexandre Brissos — 2025-10-02 */
function parsePositiveId(v, field) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0)
        throw new Error(`invalid_${field}`);
    return n;
}
/** Lê e valida janela temporal (startAt < endAt). — Alexandre Brissos — 2025-10-02 */
function parseWindow(body) {
    const start = new Date(body?.startAt || "");
    const end = new Date(body?.endAt || "");
    if (isNaN(+start) || isNaN(+end) || start >= end)
        throw new Error("invalid_window");
    return { start, end, reason: (body?.reason ?? null) };
}
/** DTO normalizado do bloco. — Alexandre Brissos — 2025-10-02 */
function toDto(b) {
    return { id: b.id, startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), reason: b.reason ?? null };
}
/** Teste de interseção temporal. — Alexandre Brissos — 2025-10-02 */
function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}
/* ========================= Helpers com efeitos (DB) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Lista blocos de uma biblioteca. — Alexandre Brissos — 2025-10-02 */
async function listBlocksForLibrary(libraryId) {
    const blocks = await prisma_1.prisma.libraryBlock.findMany({
        where: { libraryId }, orderBy: { startAt: "asc" }, select: { id: true, startAt: true, endAt: true, reason: true }
    });
    return blocks.map(toDto);
}
/** Cria bloco e bloqueia slots OPEN sobrepostos. — Alexandre Brissos — 2025-10-02 */
async function createBlockAndBlockSlots(libraryId, start, end, reason) {
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        const block = await tx.libraryBlock.create({
            data: { libraryId, startAt: start, endAt: end, reason }, select: { id: true, startAt: true, endAt: true, reason: true }
        });
        const toBlock = await tx.consultationSlot.findMany({
            where: {
                status: client_1.SlotStatus.OPEN, consultation: null,
                startAt: { lt: end }, endAt: { gt: start },
                OR: [{ libraryId }, { librarian: { userLibraries: { some: { libraryId } } } }],
            }, select: { id: true }
        });
        if (toBlock.length) {
            await tx.consultationSlot.updateMany({
                where: { id: { in: toBlock.map(s => s.id) } },
                data: { status: client_1.SlotStatus.BLOCKED, blockedByLibraryBlockId: block.id },
            });
        }
        return block;
    });
    return { ...toDto(created), reason };
}
/** Apaga bloco e reabre/reatribui slots afetados. — Alexandre Brissos — 2025-10-02 */
async function deleteBlockAndUpdateSlots(libraryId, id) {
    await prisma_1.prisma.$transaction(async (tx) => {
        const block = await tx.libraryBlock.findUnique({ where: { id }, select: { id: true, libraryId: true, startAt: true, endAt: true } });
        if (!block)
            throw Object.assign(new Error("not_found"), { status: 404 });
        if (block.libraryId !== libraryId)
            throw Object.assign(new Error("forbidden"), { status: 403 });
        const affected = await tx.consultationSlot.findMany({
            where: { blockedByLibraryBlockId: id, consultation: null, status: client_1.SlotStatus.BLOCKED },
            select: { id: true, startAt: true, endAt: true }
        });
        const minStart = new Date(Math.min(+block.startAt, ...affected.map(s => +s.startAt))); // safe com spread vazio? Math.min(Infinity, ...) se none
        const maxEnd = new Date(Math.max(+block.endAt, ...affected.map(s => +s.endAt)));
        const otherBlocks = await tx.libraryBlock.findMany({
            where: { libraryId, id: { not: id }, startAt: { lt: maxEnd }, endAt: { gt: minStart } },
            select: { id: true, startAt: true, endAt: true }
        });
        for (const s of affected) {
            const hit = otherBlocks.find(b => overlaps(s.startAt, s.endAt, b.startAt, b.endAt));
            if (hit)
                await tx.consultationSlot.update({ where: { id: s.id }, data: { blockedByLibraryBlockId: hit.id } });
            else
                await tx.consultationSlot.update({ where: { id: s.id }, data: { status: client_1.SlotStatus.OPEN, blockedByLibraryBlockId: null } });
        }
        await tx.libraryBlock.delete({ where: { id } });
    });
}
/* ========================= Rotas (inalteradas) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/**
 * Rota GET /admin/libraries/:libraryId/blocks — lista blocos da biblioteca.
 * — Alexandre Brissos — 2025-10-02
 */
r.get("/admin/libraries/:libraryId/blocks", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const blocks = await listBlocksForLibrary(libraryId);
        return res.json(blocks);
    }
    catch (e) {
        if (String(e.message).includes("invalid_libraryId"))
            return res.status(400).json({ error: "libraryId inválido" });
        return next(e);
    }
});
/**
 * Rota POST /admin/libraries/:libraryId/blocks — cria bloco e bloqueia slots OPEN.
 * Body: { startAt: ISO, endAt: ISO, reason?: string }
 * — Alexandre Brissos — 2025-10-02
 */
r.post("/admin/libraries/:libraryId/blocks", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const { start, end, reason } = parseWindow(req.body);
        const created = await createBlockAndBlockSlots(libraryId, start, end, reason);
        return res.status(201).json(created);
    }
    catch (e) {
        const msg = String(e?.message || "");
        if (msg.includes("invalid_libraryId"))
            return res.status(400).json({ error: "libraryId inválido" });
        if (msg.includes("invalid_window"))
            return res.status(400).json({ error: "janela inválida" });
        return next(e);
    }
});
/**
 * Rota DELETE /admin/libraries/:libraryId/blocks/:id — apaga bloco e reabre/reatribui.
 * — Alexandre Brissos — 2025-10-02
 */
r.delete("/admin/libraries/:libraryId/blocks/:id", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const id = parsePositiveId(req.params.id, "id");
        await deleteBlockAndUpdateSlots(libraryId, id);
        return res.status(204).end();
    }
    catch (e) {
        const msg = String(e?.message || "");
        if (msg.includes("invalid_libraryId") || msg.includes("invalid_id"))
            return res.status(400).json({ error: msg.includes("libraryId") ? "libraryId inválido" : "id inválido" });
        if (e?.status === 403)
            return res.status(403).json({ error: "sem acesso" });
        if (e?.status === 404)
            return res.status(404).json({ error: "não encontrado" });
        return next(e);
    }
});
exports.default = r;
