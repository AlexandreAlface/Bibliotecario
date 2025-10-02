"use strict";
// apps/api/src/routes/events.ts
// Autor: Alexandre Brissos 21131
// O que faz: expõe eventos culturais.
// - GET /events  → lista completa (legacy)
// - GET /        → cartões resumidos (type=evento, limit)
// Usa helpers “puros” e cada handler tem <30 linhas.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
/* ----------------- Helpers PUROS ----------------- */
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const toLimit = (v, def = 10, min = 1, max = 50) => clamp(Number(v ?? def) || def, min, max);
const toType = (v) => String(v ?? "evento").trim().toLowerCase();
const fmtDate = (d) => (d ? d.toLocaleDateString("pt-PT") : undefined);
const fmtTime = (d) => d ? d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : undefined;
const mapEvent = (e) => ({
    id: e.id,
    title: e.title,
    date: fmtDate(e.startDate),
    time: fmtTime(e.startDate),
    location: e.location ?? undefined,
    category: e.category ?? undefined,
    imageUrl: e.imageUrl ?? null,
});
/* ----------------- Rotas (<30 linhas) ----------------- */
// (opcional) endpoint "completo" – mantém como legacy
router.get("/events", async (_, res) => {
    const events = await prisma_1.prisma.culturalEvent.findMany({ orderBy: { startDate: "asc" } });
    res.json(events);
});
// GET /api/events?type=evento&limit=3
router.get("/", async (req, res, next) => {
    try {
        const type = toType(req.query.type);
        const limit = toLimit(req.query.limit, 10);
        if (type !== "evento")
            return res.json([]);
        const rows = await prisma_1.prisma.culturalEvent.findMany({
            orderBy: { startDate: "asc" },
            take: limit,
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                location: true,
                category: true,
                imageUrl: true,
            },
        });
        res.json(rows.map(mapEvent));
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
