"use strict";
// src/routes/auth-child.ts
// Autor: Alexandre Brissos 21131
// O que faz: permite à família “assumir” um filho (grava cookie seguro)
// e limpar esse estado. Inclui helpers puros para opções de cookie
// e verificação de pertença.
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeActingCookieOptions = makeActingCookieOptions;
exports.belongsToFamily = belongsToFamily;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const isProd = process.env.NODE_ENV === "production";
/* -------- Helpers puros (curtos) -------- */
function makeActingCookieOptions(opts) {
    return {
        httpOnly: true,
        secure: opts.secure,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain: opts.domain,
    };
}
async function belongsToFamily(childId, familyId) {
    const link = await prisma_1.prisma.childFamily.findUnique({
        where: { childId_familyId: { childId, familyId } },
        select: { childId: true },
    });
    return !!link;
}
/* -------- Helpers de resposta -------- */
function setActingCookie(res, childId) {
    res.cookie(ACTING_COOKIE, String(childId), makeActingCookieOptions({ secure: isProd, domain: COOKIE_DOMAIN }));
}
function clearActingCookie(res) {
    res.clearCookie(ACTING_COOKIE, {
        path: "/",
        domain: COOKIE_DOMAIN,
    });
}
/* -------- Rotas -------- */
router.post("/auth/act-as-child", auth_1.requireAuth, async (req, res, next) => {
    try {
        const childId = Number(req.body?.childId);
        const familyId = Number(req.user?.sub);
        if (!Number.isFinite(childId))
            return res.status(400).json({ error: "invalid_childId" });
        if (!Number.isFinite(familyId))
            return res.status(401).json({ error: "unauthenticated" });
        const ok = await belongsToFamily(childId, familyId);
        if (!ok)
            return res
                .status(403)
                .json({ error: "Child não pertence à tua família" });
        setActingCookie(res, childId);
        res.json({ ok: true, actingChildId: childId });
    }
    catch (e) {
        next(e);
    }
});
router.post("/auth/act-as-clear", auth_1.requireAuth, async (_req, res) => {
    clearActingCookie(res);
    res.json({ ok: true });
});
exports.default = router;
