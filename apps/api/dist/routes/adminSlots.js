"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/adminSlots.ts
const express_1 = require("express");
const prisma_1 = require("../prisma"); // ajusta o path se necessário
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
/**
 * GET /admin/libraries/:libraryId/slots
 * Query:
 *  - from, to: ISO strings (opcional; default: hoje → +30 dias)
 *  - status: "OPEN,BOOKED,BLOCKED" (opcional, multi)
 *  - librarianId: number (opcional)
 */
r.get("/admin/libraries/:libraryId/slots", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        if (!Number.isFinite(libraryId) || libraryId <= 0) {
            return res.status(400).json({ error: "libraryId inválido" });
        }
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const defaultFrom = startOfToday;
        const defaultTo = new Date(startOfToday);
        defaultTo.setDate(defaultTo.getDate() + 30);
        defaultTo.setHours(23, 59, 59, 999);
        const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom;
        const to = req.query.to ? new Date(String(req.query.to)) : defaultTo;
        const statusStr = req.query.status?.trim();
        const statuses = statusStr ? statusStr.split(",").map(s => s.trim().toUpperCase()) : undefined;
        const librarianId = req.query.librarianId ? Number(req.query.librarianId) : undefined;
        const where = {
            AND: [
                // pertença à biblioteca
                {
                    OR: [
                        { libraryId }, // slot explicitamente na biblioteca
                        { librarian: { userLibraries: { some: { libraryId } } } }, // fallback
                    ],
                },
                // intervalo (por startAt; simples e eficiente)
                { startAt: { gte: from }, endAt: { lte: to } },
            ],
        };
        if (statuses?.length)
            where.AND.push({ status: { in: statuses } });
        if (Number.isFinite(librarianId))
            where.AND.push({ librarianId });
        const slots = await prisma_1.prisma.consultationSlot.findMany({
            where,
            orderBy: [{ startAt: "asc" }],
            select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
                librarian: { select: { id: true, fullName: true, email: true } },
                consultation: { select: { id: true } },
            },
            take: 1000, // proteção
        });
        res.json(slots.map(s => ({
            id: s.id,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            status: s.status,
            librarian: { id: s.librarian.id, fullName: s.librarian.fullName, email: s.librarian.email },
            consultationId: s.consultation?.id ?? null,
        })));
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /admin/libraries/:libraryId/slots/:slotId
 * Body: { status: "OPEN" | "BLOCKED" }
 * Regras:
 *  - só permite OPEN <-> BLOCKED
 *  - BOOKED não pode ser alterado aqui
 */
r.patch("/admin/libraries/:libraryId/slots/:slotId", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const libraryId = Number(req.params.libraryId);
        const slotId = Number(req.params.slotId);
        const nextStatus = String(req.body?.status || "").toUpperCase();
        if (!["OPEN", "BLOCKED"].includes(nextStatus)) {
            return res.status(400).json({ error: "status inválido (apenas OPEN ou BLOCKED)" });
        }
        // valida slot + pertença
        const slot = await prisma_1.prisma.consultationSlot.findUnique({
            where: { id: slotId },
            select: {
                id: true, status: true, librarianId: true, libraryId: true,
                consultation: { select: { id: true } },
                librarian: { select: { userLibraries: { select: { libraryId: true } } } },
            },
        });
        if (!slot)
            return res.status(404).json({ error: "slot não encontrado" });
        const belongsToLibrary = slot.libraryId === libraryId ||
            slot.librarian.userLibraries.some(ul => ul.libraryId === libraryId);
        if (!belongsToLibrary)
            return res.status(403).json({ error: "sem acesso a este slot" });
        if (slot.status === "BOOKED" || slot.consultation?.id) {
            return res.status(409).json({ error: "slot reservado — não pode ser alterado aqui" });
        }
        if (slot.status === nextStatus) {
            return res.json({ ok: true, unchanged: true, id: slot.id, status: slot.status });
        }
        const updated = await prisma_1.prisma.consultationSlot.update({
            where: { id: slot.id },
            data: { status: nextStatus },
            select: { id: true, status: true },
        });
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
