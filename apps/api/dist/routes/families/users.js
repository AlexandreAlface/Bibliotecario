"use strict";
// src/routes/users.ts
// Autor: Alexandre Brissos 21131
// O que faz: lê/atualiza o perfil do utilizador autenticado.
// Organização: helpers PUROS + handlers curtos + middleware castado para RequestHandler.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
/* ========================== Constantes & Tipos ========================== */
// Campos que devolvemos ao FE (evita repetir select).
const userSelect = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    citizenCard: true,
    address: true,
};
/* =============================== Helpers PUROS =============================== */
// Extrai o ID do utilizador autenticado do request (sem efeitos colaterais).
function getAuthUserId(req) {
    const id = Number(req.user?.sub);
    return Number.isFinite(id) ? id : null;
}
// Normaliza o body de atualização: strings, nullables e elimina undefined.
function buildUpdateData(body) {
    return {
        ...(body?.fullName !== undefined && { fullName: String(body.fullName) }),
        ...(body?.email !== undefined && { email: String(body.email) }),
        ...(body?.phone !== undefined && { phone: body.phone ?? null }),
        ...(body?.citizenCard !== undefined && { citizenCard: body.citizenCard ?? null }),
        ...(body?.address !== undefined && { address: body.address ?? null }),
    };
}
// Deteta erro de unicidade de email do Prisma, de forma tolerante.
function isEmailUniqueError(e) {
    if (e?.code !== "P2002")
        return false;
    const tgt = e?.meta?.target;
    return Array.isArray(tgt) ? tgt.includes("email") : String(tgt ?? "").includes("email");
}
/* =============================== Handlers (<= 30 linhas) =============================== */
// GET /api/users/me — devolve perfil normalizado
const getMe = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthenticated" });
        const u = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
        if (!u)
            return res.status(404).json({ error: "Utilizador não encontrado" });
        res.json(u);
    }
    catch (e) {
        next(e);
    }
};
// PATCH /api/users/me — atualiza apenas campos enviados
const patchMe = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthenticated" });
        const data = buildUpdateData(req.body);
        const u = await prisma_1.prisma.user.update({ where: { id: userId }, data, select: userSelect });
        res.json(u);
    }
    catch (e) {
        if (isEmailUniqueError(e))
            return res.status(409).json({ error: "E-mail já em uso" });
        next(e);
    }
};
/* =============================== Router =============================== */
// Nota: alguns middlewares JS não exportam tipos → cast para RequestHandler evita erros TS.
const authMw = auth_1.requireAuth;
router.get("/me", authMw, getMe);
router.patch("/me", authMw, patchMe);
exports.default = router;
