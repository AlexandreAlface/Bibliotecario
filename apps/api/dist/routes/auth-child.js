"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth-child.js
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("./auth.js");
const router = (0, express_1.Router)();
const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
const isProd = process.env.NODE_ENV === "production";
function setActingCookie(res, childId) {
    res.cookie(ACTING_COOKIE, String(childId), {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
    });
}
function clearActingCookie(res) {
    res.clearCookie(ACTING_COOKIE, { path: "/" });
}
router.post("/auth/act-as-child", auth_js_1.requireAuth, async (req, res, next) => {
    try {
        const { childId } = req.body;
        const link = await prisma_js_1.prisma.childFamily.findUnique({
            where: {
                childId_familyId: {
                    childId: Number(childId),
                    familyId: Number(req.user.sub),
                },
            },
        });
        if (!link)
            return res.status(403).json({ error: "Child não pertence à tua família" });
        setActingCookie(res, Number(childId));
        res.json({ ok: true, actingChildId: Number(childId) });
    }
    catch (e) {
        next(e);
    }
});
router.post("/auth/act-as-clear", auth_js_1.requireAuth, async (_req, res) => {
    clearActingCookie(res);
    res.json({ ok: true });
});
exports.default = router;
