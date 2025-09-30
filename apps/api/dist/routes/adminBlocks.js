"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middlewares/auth");
const client_1 = require("@prisma/client");
const r = (0, express_1.Router)();
// GET /admin/libraries/:libraryId/blocks
r.get("/admin/libraries/:libraryId/blocks", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        if (!Number.isFinite(libraryId) || libraryId <= 0)
            return res.status(400).json({ error: "libraryId inválido" });
        const blocks = await prisma_1.prisma.libraryBlock.findMany({
            where: { libraryId },
            orderBy: { startAt: "asc" },
            select: { id: true, startAt: true, endAt: true, reason: true },
        });
        res.json(blocks.map(b => ({
            id: b.id,
            startAt: b.startAt.toISOString(),
            endAt: b.endAt.toISOString(),
            reason: b.reason ?? null,
        })));
    }
    catch (e) {
        next(e);
    }
});
// POST /admin/libraries/:libraryId/blocks
r.post("/admin/libraries/:libraryId/blocks", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        const { startAt, endAt, reason } = (req.body ?? {});
        if (!Number.isFinite(libraryId) || libraryId <= 0)
            return res.status(400).json({ error: "libraryId inválido" });
        const start = new Date(startAt || "");
        const end = new Date(endAt || "");
        if (isNaN(+start) || isNaN(+end) || start >= end)
            return res.status(400).json({ error: "janela inválida" });
        const created = await prisma_1.prisma.$transaction(async (tx) => {
            // 1) cria o bloco global
            const block = await tx.libraryBlock.create({
                data: { libraryId, startAt: start, endAt: end, reason: reason || null },
                select: { id: true, startAt: true, endAt: true },
            });
            // 2) encontra todos os SLOTS OPEN que colidem e pertencem à biblioteca
            const toBlock = await tx.consultationSlot.findMany({
                where: {
                    status: client_1.SlotStatus.OPEN,
                    consultation: null, // não mexer em slots com consulta
                    startAt: { lt: end },
                    endAt: { gt: start },
                    OR: [
                        { libraryId }, // slots etiquetados com a biblioteca
                        { librarian: { userLibraries: { some: { libraryId } } } }, // slots "sem libraryId" mas do staff desta biblioteca
                    ],
                },
                select: { id: true },
            });
            if (toBlock.length) {
                await tx.consultationSlot.updateMany({
                    where: { id: { in: toBlock.map(s => s.id) } },
                    data: {
                        status: client_1.SlotStatus.BLOCKED,
                        blockedByLibraryBlockId: block.id,
                    },
                });
            }
            return block;
        });
        res.status(201).json({
            id: created.id,
            startAt: created.startAt.toISOString(),
            endAt: created.endAt.toISOString(),
            reason: reason ?? null,
        });
    }
    catch (e) {
        next(e);
    }
});
// DELETE /admin/libraries/:libraryId/blocks/:id
r.delete("/admin/libraries/:libraryId/blocks/:id", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        const id = Number(req.params.id);
        if (!Number.isFinite(libraryId) || libraryId <= 0)
            return res.status(400).json({ error: "libraryId inválido" });
        if (!Number.isFinite(id) || id <= 0)
            return res.status(400).json({ error: "id inválido" });
        await prisma_1.prisma.$transaction(async (tx) => {
            const block = await tx.libraryBlock.findUnique({
                where: { id },
                select: { id: true, libraryId: true, startAt: true, endAt: true },
            });
            if (!block)
                return res.status(404).json({ error: "não encontrado" });
            if (block.libraryId !== libraryId)
                return res.status(403).json({ error: "sem acesso" });
            // slots que foram bloqueados por ESTE bloco e continuam sem consulta
            const affected = await tx.consultationSlot.findMany({
                where: {
                    blockedByLibraryBlockId: id,
                    consultation: null,
                    status: client_1.SlotStatus.BLOCKED,
                },
                select: { id: true, startAt: true, endAt: true, libraryId: true, librarianId: true },
            });
            // ver se existem outros blocos que ainda colidem
            let minStart = block.startAt;
            let maxEnd = block.endAt;
            if (affected.length) {
                const mins = Math.min(...affected.map(s => +s.startAt));
                const maxs = Math.max(...affected.map(s => +s.endAt));
                minStart = new Date(Math.min(+minStart, mins));
                maxEnd = new Date(Math.max(+maxEnd, maxs));
            }
            const otherBlocks = await tx.libraryBlock.findMany({
                where: {
                    libraryId,
                    id: { not: id },
                    startAt: { lt: maxEnd },
                    endAt: { gt: minStart },
                },
                select: { id: true, startAt: true, endAt: true },
            });
            // reabrir ou reatribuir
            for (const s of affected) {
                const stillHit = otherBlocks.find(b => s.startAt < b.endAt && b.startAt < s.endAt);
                if (stillHit) {
                    await tx.consultationSlot.update({
                        where: { id: s.id },
                        data: { blockedByLibraryBlockId: stillHit.id }, // mantém BLOCKED, troca “dono”
                    });
                }
                else {
                    await tx.consultationSlot.update({
                        where: { id: s.id },
                        data: { status: client_1.SlotStatus.OPEN, blockedByLibraryBlockId: null },
                    });
                }
            }
            // finalmente, apaga o bloco
            await tx.libraryBlock.delete({ where: { id } });
        });
        res.status(204).end();
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
