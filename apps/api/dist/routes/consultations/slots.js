"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const auth_1 = require("../../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
// GET /api/consultations/librarians/:librarianId/slots?from=...&to=...
r.get("/librarians/:librarianId/slots", async (req, res) => {
    try {
        const librarianId = Number(req.params.librarianId);
        const from = new Date(String(req.query.from));
        const to = new Date(String(req.query.to));
        if (!Number.isFinite(librarianId) || isNaN(+from) || isNaN(+to)) {
            return res
                .status(400)
                .json({ error: "librarianId, from e to são obrigatórios" });
        }
        const slots = await prisma.consultationSlot.findMany({
            where: { librarianId, startAt: { gte: from }, endAt: { lte: to } },
            orderBy: { startAt: "asc" },
        });
        res.json(slots);
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
        const librarianId = Number(req.params.librarianId);
        // bibliotecas do bibliotecário
        const links = await prisma.userLibrary.findMany({
            where: { userId: librarianId },
            select: { libraryId: true },
        });
        const onlyOneLibrary = links.length === 1 ? links[0].libraryId : null;
        const bodySlots = Array.isArray(req.body?.slots) ? req.body.slots : [];
        // resolver items + validar libraryId
        const resolved = bodySlots.map((s) => {
            const startAt = new Date(s.startAt);
            const endAt = new Date(s.endAt);
            const libId = s.libraryId != null ? Number(s.libraryId) : onlyOneLibrary;
            if (!Number.isFinite(libId)) {
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
        if (resolved.length === 0) {
            return res.json({ created: 0, skipped: 0, blockedAuto: 0 });
        }
        // intervalo agregador para buscar bloqueios uma vez
        const minStart = new Date(Math.min(...resolved.map((s) => +s.startAt)));
        const maxEnd = new Date(Math.max(...resolved.map((s) => +s.endAt)));
        const libs = Array.from(new Set(resolved.map((s) => s.libraryId)));
        const blocks = await prisma.libraryBlock.findMany({
            where: {
                libraryId: { in: libs },
                startAt: { lt: maxEnd },
                endAt: { gt: minStart },
            },
            select: { libraryId: true, startAt: true, endAt: true },
        });
        const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
        // dividir: criações válidas vs. colidentes
        let blockedAuto = 0;
        const toCreate = resolved
            .map((s) => {
            const hit = blocks.some((b) => b.libraryId === s.libraryId &&
                overlaps(s.startAt, s.endAt, b.startAt, b.endAt));
            if (hit) {
                // criar já como BLOQUEADO (ou então “skip”, como preferires)
                return { ...s, status: client_1.SlotStatus.BLOCKED };
            }
            return s;
        })
            .filter(Boolean);
        const created = await prisma.consultationSlot.createMany({
            data: toCreate,
            skipDuplicates: true,
        });
        const skipped = resolved.length - toCreate.length;
        res.json({
            created: created.count,
            skipped,
            blockedAuto,
        });
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to bulk create" });
    }
});
// PATCH /api/consultations/slots/:id  body: { status: 'OPEN' | 'BLOCKED' }
r.patch("/slots/:id", (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const status = req.body?.status;
        if (!["OPEN", "BLOCKED"].includes(status)) {
            return res.status(400).json({ error: "invalid status" });
        }
        const slot = await prisma.consultationSlot.update({
            where: { id },
            data: { status },
        });
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
        const fromStr = String(req.query.from || "");
        const toStr = String(req.query.to || "");
        const from = new Date(fromStr);
        const to = new Date(toStr);
        if (isNaN(+from) || isNaN(+to)) {
            return res
                .status(400)
                .json({ error: "from e to (ISO) são obrigatórios" });
        }
        const librarianId = req.query.librarianId
            ? Number(req.query.librarianId)
            : undefined;
        const libraryId = req.query.libraryId
            ? Number(req.query.libraryId)
            : undefined;
        const items = await prisma.consultationSlot.findMany({
            where: {
                status: client_2.$Enums.SlotStatus.OPEN,
                startAt: { gte: from },
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
                // ⚠️ Se o teu User não tiver avatarUrl no schema, NÃO seleciones:
                librarian: { select: { fullName: true /*, avatarUrl: true */ } },
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
            librarianName: s.librarian?.fullName,
            // se adicionares avatarUrl ao schema e ao select acima, devolve-o aqui:
            librarianAvatarUrl: null,
            libraryId: s.libraryId ?? undefined,
            libraryName: s.library?.name ?? undefined,
        }));
        res.json(mapped);
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to list slots" });
    }
});
r.get("/librarians/:librarianId/libraries", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    try {
        const librarianId = Number(req.params.librarianId);
        const isAdmin = req.user?.roles?.includes(auth_1.ROLES.ADMIN) === true;
        if (!isAdmin && req.user?.id !== librarianId) {
            return res.status(403).json({ error: "forbidden" });
        }
        const links = await prisma.userLibrary.findMany({
            where: { userId: librarianId },
            select: { library: { select: { id: true, name: true } } },
            orderBy: { libraryId: "asc" },
        });
        const libs = links.map((l) => l.library).filter(Boolean);
        res.json(libs);
    }
    catch (e) {
        console.error(e);
        res.status(400).json({ error: e?.message ?? "failed to list libraries" });
    }
});
exports.default = r;
