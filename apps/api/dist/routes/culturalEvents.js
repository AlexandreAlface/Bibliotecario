"use strict";
// apps/api/src/routes/cultural-events.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista eventos culturais (com paginação/cursor) e cria/cancela reservas.
// Usa helpers “puros” e cada handler tem <30 linhas.
Object.defineProperty(exports, "__esModule", { value: true });
exports.culturalEventsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middlewares/auth");
exports.culturalEventsRouter = (0, express_1.Router)();
/* --------------- Helpers PUROS --------------- */
const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const toDate = (v) => {
    if (!v)
        return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
};
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const buildRangeFilter = (from, to) => {
    const now = new Date();
    const f = from && !Number.isNaN(from.getTime()) ? from : now;
    if (to && !Number.isNaN(to.getTime())) {
        return {
            OR: [
                { startDate: { gte: f, lte: to } },
                { AND: [{ startDate: { lte: to } }, { endDate: { gte: f } }] },
            ],
        };
    }
    return {
        OR: [{ startDate: { gte: f } }, { endDate: { gte: f } }],
    };
};
const buildWhere = ({ q, libraryId, range, cursor, }) => ({
    ...(q
        ? {
            OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { location: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { library: { is: { name: { contains: q, mode: "insensitive" } } } },
            ],
        }
        : {}),
    ...(libraryId ? { libraryId } : {}),
    ...range,
    ...(cursor ? { id: { gt: cursor } } : {}),
});
const mapEvent = (r, reservedIds) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate ? r.endDate.toISOString() : null,
    location: r.location,
    category: r.category,
    capacity: r.capacity,
    imageUrl: r.imageUrl,
    libraryId: r.libraryId,
    libraryName: r.library?.name ?? null,
    reserved: reservedIds.has(r.id),
});
const isFamilyUser = (req) => {
    const me = req.user;
    const roles = (me?.roles || []).map((r) => r.toUpperCase());
    return {
        userId: me?.id,
        isFamily: roles.includes(auth_1.ROLES.FAMILY) ||
            roles.includes("FAMÍLIA") ||
            roles.includes("FAMILIA"),
    };
};
const getReservedIds = async (familyId, eventIds) => {
    if (!eventIds.length)
        return new Set();
    const rows = await prisma_1.prisma.eventReservation.findMany({
        where: { familyId, eventId: { in: eventIds } },
        select: { eventId: true },
    });
    return new Set(rows.map((r) => r.eventId));
};
const ensureCapacityOrThrow = async (eventId) => {
    const ev = await prisma_1.prisma.culturalEvent.findUnique({
        where: { id: eventId },
        select: { id: true, capacity: true },
    });
    if (!ev)
        return { notFound: true };
    if (typeof ev.capacity === "number") {
        const count = await prisma_1.prisma.eventReservation.count({ where: { eventId } });
        if (count >= ev.capacity)
            return { full: true };
    }
    return { ok: true };
};
/* --------------- Handlers (<30 linhas) --------------- */
// GET /cultural-events
exports.culturalEventsRouter.get("/cultural-events", async (req, res) => {
    try {
        const q = String(req.query.q ?? "").trim() || undefined;
        const limit = clamp(parseInt(String(req.query.limit ?? 24), 10) || 24, 1, 100);
        const cursor = toInt(req.query.cursor);
        const libraryId = toInt(req.query.libraryId);
        const range = buildRangeFilter(toDate(req.query.from), toDate(req.query.to));
        const where = buildWhere({ q, libraryId, range, cursor });
        const rows = await prisma_1.prisma.culturalEvent.findMany({
            where,
            orderBy: { id: "asc" },
            take: limit + 1,
            select: {
                id: true,
                title: true,
                description: true,
                startDate: true,
                endDate: true,
                location: true,
                category: true,
                capacity: true,
                imageUrl: true,
                libraryId: true,
                library: { select: { name: true } },
            },
        });
        const { userId, isFamily } = isFamilyUser(req);
        const reservedIds = userId && isFamily
            ? await getReservedIds(userId, rows.map((r) => r.id))
            : new Set();
        const slice = rows.slice(0, limit);
        return res.json({
            items: slice.map((r) => mapEvent(r, reservedIds)),
            nextCursor: rows.length > limit ? rows[limit].id : null,
        });
    }
    catch (e) {
        console.error("GET /cultural-events", e);
        return res
            .status(500)
            .json({ error: "internal_error", message: e?.message });
    }
});
// POST /cultural-events/:id/reservations
exports.culturalEventsRouter.post("/cultural-events/:id/reservations", (0, auth_1.requireRole)(auth_1.ROLES.FAMILY, "FAMÍLIA"), async (req, res) => {
    try {
        const eventId = toInt(req.params.id);
        if (!eventId || eventId <= 0)
            return res.status(400).json({ error: "invalid_event_id" });
        const familyId = req.user.id;
        const exists = await prisma_1.prisma.eventReservation.findFirst({
            where: { eventId, familyId },
            select: { id: true },
        });
        if (exists)
            return res.status(409).json({ error: "already_reserved" });
        const cap = await ensureCapacityOrThrow(eventId);
        if ("notFound" in cap)
            return res.status(404).json({ error: "not_found" });
        if ("full" in cap)
            return res.status(409).json({ error: "capacity_full" });
        const created = await prisma_1.prisma.eventReservation.create({
            data: { eventId, familyId, status: "CONFIRMADA" },
            select: {
                id: true,
                eventId: true,
                familyId: true,
                bookedAt: true,
                status: true,
            },
        });
        return res.json(created);
    }
    catch (e) {
        console.error("POST /cultural-events/:id/reservations", e);
        return res
            .status(500)
            .json({ error: "internal_error", message: e?.message });
    }
});
// DELETE /cultural-events/:id/reservations
exports.culturalEventsRouter.delete("/cultural-events/:id/reservations", (0, auth_1.requireRole)(auth_1.ROLES.FAMILY, "FAMÍLIA"), async (req, res) => {
    try {
        const eventId = toInt(req.params.id);
        if (!eventId || eventId <= 0)
            return res.status(400).json({ error: "invalid_event_id" });
        const familyId = req.user.id;
        const existing = await prisma_1.prisma.eventReservation.findFirst({
            where: { eventId, familyId },
            select: { id: true },
        });
        if (!existing)
            return res.status(404).json({ error: "reservation_not_found" });
        await prisma_1.prisma.eventReservation.delete({ where: { id: existing.id } });
        return res.json({ ok: true });
    }
    catch (e) {
        console.error("DELETE /cultural-events/:id/reservations", e);
        return res
            .status(500)
            .json({ error: "internal_error", message: e?.message });
    }
});
exports.default = exports.culturalEventsRouter;
