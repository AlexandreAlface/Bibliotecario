"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/events.js
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const router = (0, express_1.Router)();
// (opcional) endpoint "completo" – deixa como está
router.get("/events", async (_, res) => {
    const events = await prisma_js_1.prisma.culturalEvent.findMany({
        orderBy: { startDate: "asc" },
    });
    res.json(events);
});
/**
 * GET /api/events?type=evento&limit=3
 */
router.get("/", async (req, res, next) => {
    try {
        const type = String(req.query.type || "evento");
        const limit = Number(req.query.limit ?? 10);
        if (type !== "evento")
            return res.json([]);
        const events = await prisma_js_1.prisma.culturalEvent.findMany({
            orderBy: { startDate: "asc" },
            take: limit,
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                location: true,
                category: true, // 👈 necessário para o filtro "Biblioteca"
                imageUrl: true, // 👈 útil p/ cartaz
            },
        });
        res.json(events.map((e) => ({
            id: e.id,
            title: e.title,
            date: e.startDate?.toLocaleDateString("pt-PT"),
            time: e.startDate?.toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
            }),
            location: e.location ?? undefined,
            category: e.category ?? undefined,
            imageUrl: e.imageUrl ?? null,
        })));
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
