"use strict";
// apps/api/src/routes/libraries.ts
// Autor: Alexandre Brissos 21131
// O que faz: devolve as bibliotecas do utilizador autenticado.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
/* ---------- Helpers PUROS ---------- */
const toUserId = (r) => {
    const id = Number(r.user?.sub ?? r.user?.id ?? r.session?.userId);
    return Number.isFinite(id) && id > 0 ? id : null;
};
const libWhere = (userId) => ({ userLibraries: { some: { userId } } });
const libSelect = { id: true, name: true };
const asList = (rows) => ({ items: rows });
/* ---------- Middleware fino ---------- */
const requireAuth = (req, res, next) => {
    const uid = toUserId(req);
    if (!uid) {
        res.status(401).json({ error: "unauthorized" });
        return;
    }
    req.authUserId = uid;
    next();
};
const router = (0, express_1.Router)();
/* ---------- Rotas (<30 linhas) ---------- */
// GET /libraries/mine
router.get("/libraries/mine", requireAuth, async (req, res, next) => {
    try {
        const userId = req.authUserId;
        const rows = await prisma_1.prisma.library.findMany({
            where: libWhere(userId),
            select: libSelect,
            orderBy: { name: "asc" },
        });
        res.json(asList(rows));
    }
    catch (e) {
        console.error("GET /libraries/mine", e);
        next(e);
    }
});
// GET /libraries?scope=mine (alias)
router.get("/libraries", requireAuth, async (req, res, next) => {
    try {
        if (String(req.query.scope || "").toLowerCase() !== "mine") {
            res.status(400).json({ error: "unsupported_scope" });
            return;
        }
        const userId = req.authUserId;
        const rows = await prisma_1.prisma.library.findMany({
            where: libWhere(userId),
            select: libSelect,
            orderBy: { name: "asc" },
        });
        res.json(asList(rows));
    }
    catch (e) {
        console.error("GET /libraries", e);
        next(e);
    }
});
exports.default = router;
