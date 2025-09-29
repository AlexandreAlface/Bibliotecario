"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const COOKIE_NAME = process.env.COOKIE_NAME || "bf_access";
const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
const isProd = process.env.NODE_ENV === "production";
// ------- helpers -------
function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
    });
}
function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}
// ◀️ middleware auth
function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token)
        return res.status(401).json({ error: "Não autenticado" });
    try {
        req.user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        next();
    }
    catch {
        return res.status(401).json({ error: "Sessão inválida" });
    }
}
// ------- rotas -------
// POST /api/auth/register
router.post("/register", async (req, res, next) => {
    try {
        const { fullName, email, phone, citizenCard, address, postalCode, // opcional
        password, libraryId, // 👈 novo (id da biblioteca)
        children = [], } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: "Campos obrigatórios em falta" });
        }
        const exists = await prisma_js_1.prisma.user.findUnique({ where: { email } });
        if (exists)
            return res.status(409).json({ error: "E-mail já registado" });
        const passwordHash = await bcryptjs_1.default.hash(String(password), 12);
        const role = await prisma_js_1.prisma.role.upsert({
            where: { name: "FAMÍLIA" },
            update: {},
            create: { name: "FAMÍLIA" },
        });
        const user = await prisma_js_1.prisma.user.create({
            data: {
                fullName,
                email,
                phone,
                citizenCard,
                address,
                postalCode: postalCode,
                passwordHash,
                userRoles: { create: { roleId: role.id } },
                // associa biblioteca se vier no payload
                ...(libraryId
                    ? { userLibraries: { create: { libraryId: Number(libraryId) } } }
                    : {}),
                children: {
                    create: children.map((c) => ({
                        child: {
                            create: {
                                name: [c.firstName, c.lastName]
                                    .filter(Boolean)
                                    .join(" ")
                                    .trim(),
                                birthDate: c.birthDate
                                    ? new Date(c.birthDate)
                                    : new Date(new Date().getFullYear() - Number(c.age || 0), 0, 1),
                                gender: c.gender || null,
                                readerProfile: c.readerProfile || null,
                            },
                        },
                    })),
                },
            },
            select: { id: true, fullName: true, email: true },
        });
        return res
            .status(201)
            .json({ userId: user.id, emailVerification: "pending" });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ error: "Credenciais em falta" });
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { email },
            include: { userRoles: { include: { role: true } } },
        });
        if (!user)
            return res.status(401).json({ error: "Credenciais inválidas" });
        const ok = await bcryptjs_1.default.compare(String(password), user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: "Credenciais inválidas" });
        const roles = user.userRoles.map((ur) => ur.role.name);
        const token = signToken({ sub: user.id, roles });
        setAuthCookie(res, token);
        res.clearCookie(ACTING_COOKIE, { path: "/" });
        return res.json({
            user: { id: user.id, fullName: user.fullName, email: user.email, roles },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/auth/me
router.get("/me", async (req, res, next) => {
    try {
        const COOKIE_NAME = process.env.COOKIE_NAME || "bf_access";
        const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
        const secret = process.env.JWT_SECRET;
        const token = req.cookies?.[COOKIE_NAME];
        if (!token || !secret)
            return res.json(null);
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, secret);
        }
        catch {
            return res.json(null);
        }
        const userId = typeof payload.sub === "number"
            ? payload.sub
            : typeof payload.sub === "string" && /^\d+$/.test(payload.sub)
                ? Number(payload.sub)
                : typeof payload.id === "number"
                    ? payload.id
                    : typeof payload.userId === "number"
                        ? payload.userId
                        : undefined;
        if (!Number.isFinite(userId))
            return res.json(null);
        const u = await prisma_js_1.prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                citizenCard: true,
                address: true,
                postalCode: true,
                userRoles: { include: { role: true } },
                children: {
                    include: {
                        child: {
                            select: {
                                id: true,
                                name: true,
                                birthDate: true,
                                gender: true,
                                readerProfile: true,
                            },
                        },
                    },
                },
            },
        });
        if (!u)
            return res.json(null);
        const roles = u.userRoles.map((ur) => ur.role.name);
        const children = u.children.map((c) => ({
            id: c.childId,
            name: c.child.name,
            birthDate: c.child.birthDate,
            gender: c.child.gender,
            readerProfile: c.child.readerProfile,
            avatarUrl: null,
        }));
        const actingId = Number(req.cookies?.[ACTING_COOKIE] || 0);
        if (actingId) {
            const child = children.find((c) => c.id === actingId) || null;
            if (child) {
                const rolesWithChild = Array.from(new Set([...roles, "CRIANÇA"]));
                return res.json({
                    id: u.id,
                    fullName: u.fullName,
                    email: u.email,
                    roles: rolesWithChild,
                    actingChild: child,
                    children,
                    phone: u.phone,
                    citizenCard: u.citizenCard,
                    address: u.address,
                    postalCode: u.postalCode,
                });
            }
        }
        return res.json({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            roles,
            actingChild: null,
            children,
            phone: u.phone,
            citizenCard: u.citizenCard,
            address: u.address,
            postalCode: u.postalCode,
        });
    }
    catch (e) {
        next(e);
    }
});
// POST /api/auth/logout
router.post("/logout", (req, res) => {
    clearAuthCookie(res);
    res.clearCookie(ACTING_COOKIE, { path: "/" });
    res.status(204).end();
});
exports.default = router;
