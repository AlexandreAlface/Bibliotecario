"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/users.js
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("./auth.js");
const router = (0, express_1.Router)();
// Opcional: devolver o perfil normalizado (se precisares)
router.get("/me", auth_js_1.requireAuth, async (req, res, next) => {
    try {
        const u = await prisma_js_1.prisma.user.findUnique({
            where: { id: Number(req.user.sub) },
            select: {
                id: true, fullName: true, email: true,
                phone: true, citizenCard: true, address: true,
            },
        });
        if (!u)
            return res.status(404).json({ error: "Utilizador não encontrado" });
        res.json(u);
    }
    catch (e) {
        next(e);
    }
});
// PATCH /api/users/me  → atualiza campos do utilizador autenticado
router.patch("/me", auth_js_1.requireAuth, async (req, res, next) => {
    try {
        const { fullName, email, phone, citizenCard, address } = req.body || {};
        const data = {
            ...(fullName !== undefined && { fullName: String(fullName) }),
            ...(email !== undefined && { email: String(email) }),
            ...(phone !== undefined && { phone: phone ?? null }),
            ...(citizenCard !== undefined && { citizenCard: citizenCard ?? null }),
            ...(address !== undefined && { address: address ?? null }),
        };
        const u = await prisma_js_1.prisma.user.update({
            where: { id: Number(req.user.sub) },
            data,
            select: {
                id: true, fullName: true, email: true,
                phone: true, citizenCard: true, address: true,
            },
        });
        res.json(u);
    }
    catch (e) {
        // conflito de email já existente
        if (e?.code === "P2002" && e?.meta?.target?.includes("email")) {
            return res.status(409).json({ error: "E-mail já em uso" });
        }
        next(e);
    }
});
exports.default = router;
