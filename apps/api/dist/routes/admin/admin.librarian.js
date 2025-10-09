"use strict";
/**
 * Admin — gestão de bibliotecários.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Mantidas as rotas originais; apenas limpeza, comentários e extração de helpers
 *       para reduzir complexidade e aproximar de métodos "puros" quando possível.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLibrariansRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../../middlewares/auth");
exports.adminLibrariansRouter = (0, express_1.Router)();
/* ========================= Helpers puros (sem efeitos) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Valida e converte um ID positivo. — Alexandre Brissos — 2025-10-02 */
function parsePositiveId(v, field) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0)
        throw new Error(`invalid_${field}`);
    return n;
}
/** Garante campos obrigatórios. — Alexandre Brissos — 2025-10-02 */
function requireFields(obj, keys) {
    for (const k of keys)
        if (!obj?.[k])
            throw new Error("missing_fields");
}
/** Determina se o utilizador é ADMIN. — Alexandre Brissos — 2025-10-02 */
function isAdmin(me) {
    return Boolean(me?.roles?.some((r) => r?.toUpperCase() === auth_1.ROLES.ADMIN));
}
/** Normaliza corpo do pedido para criar/atualizar utilizador. — Alexandre Brissos — 2025-10-02 */
function normalizeUserBody(body) {
    const { fullName, email, phone, password } = body || {};
    return { fullName, email, phone, password };
}
/* ========================= Helpers com efeitos (DB) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Obtém/cria o role de bibliotecário (aceita aliases). — Alexandre Brissos — 2025-10-02 */
async function getOrCreateLibrarianRole() {
    const aliases = ["BIBLIOTECÁRIO", "BIBLIOTECARIO", "LIBRARIAN"];
    const found = await prisma_1.prisma.role.findFirst({ where: { name: { in: aliases } } });
    return found ?? prisma_1.prisma.role.create({ data: { name: "BIBLIOTECÁRIO" } });
}
/** Cria utilizador com password dada ou temporária. — Alexandre Brissos — 2025-10-02 */
async function createUserWithPassword({ fullName, email, phone, password }, saltRounds = 10) {
    const pwd = password?.trim() || Math.random().toString(36).slice(-12);
    const passwordHash = await bcryptjs_1.default.hash(pwd, saltRounds);
    return prisma_1.prisma.user.create({ data: { fullName, email, phone: phone || null, passwordHash } });
}
/** Atualiza nome/telefone se necessário. — Alexandre Brissos — 2025-10-02 */
async function updateUserIfChanged(user, changes) {
    const data = {};
    if (changes.fullName && changes.fullName !== user.fullName)
        data.fullName = changes.fullName;
    if (changes.phone && changes.phone !== user.phone)
        data.phone = changes.phone;
    return Object.keys(data).length ? prisma_1.prisma.user.update({ where: { id: user.id }, data }) : user;
}
/** Garante ligação user↔role. — Alexandre Brissos — 2025-10-02 */
async function ensureUserRole(userId, roleId) {
    const has = await prisma_1.prisma.userRole.findUnique({ where: { userId_roleId: { userId, roleId } } });
    if (!has)
        await prisma_1.prisma.userRole.create({ data: { userId, roleId } });
}
/** Garante ligação user↔library. — Alexandre Brissos — 2025-10-02 */
async function ensureUserLibrary(userId, libraryId) {
    const has = await prisma_1.prisma.userLibrary.findUnique({ where: { userId_libraryId: { userId, libraryId } } });
    if (!has)
        await prisma_1.prisma.userLibrary.create({ data: { userId, libraryId } });
}
/** Verifica se o utilizador pode gerir a biblioteca. — Alexandre Brissos — 2025-10-02 */
async function canManageLibrary(me, libraryId) {
    if (isAdmin(me))
        return true;
    if (!me?.id)
        return false;
    const link = await prisma_1.prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me.id, libraryId } },
        select: { userId: true },
    });
    return Boolean(link);
}
/** Remove ligação user↔library. — Alexandre Brissos — 2025-10-02 */
async function detachUserFromLibrary(userId, libraryId) {
    const link = await prisma_1.prisma.userLibrary.findUnique({ where: { userId_libraryId: { userId, libraryId } } });
    if (!link)
        return false;
    await prisma_1.prisma.userLibrary.delete({ where: { userId_libraryId: { userId, libraryId } } });
    return true;
}
/** Criação completa de bibliotecário (endpoint admin/librarians). — Alexandre Brissos — 2025-10-02 */
async function createAdminLibrarian(payload) {
    const { fullName, email, phone, citizenCard, address, password, libraryId } = payload || {};
    requireFields({ fullName, email, password, libraryId }, ["fullName", "email", "password", "libraryId"]);
    const exists = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (exists)
        throw new Error("E-mail já registado");
    const passwordHash = await bcryptjs_1.default.hash(String(password), 12);
    const role = await prisma_1.prisma.role.upsert({ where: { name: auth_1.ROLES.LIBRARIAN }, update: {}, create: { name: auth_1.ROLES.LIBRARIAN } });
    return prisma_1.prisma.user.create({
        data: {
            fullName,
            email,
            phone: phone || null,
            citizenCard: citizenCard || null,
            address: address || null,
            passwordHash,
            userRoles: { create: { roleId: role.id } },
            userLibraries: { create: { libraryId: Number(libraryId) } },
        },
        select: { id: true, fullName: true, email: true },
    });
}
/* ========================= Rotas (inalteradas) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/**
 * Rota POST /admin/libraries/:libraryId/librarians/new — cria/garante bibliotecário na biblioteca.
 * Body: { fullName, email, phone?, password? }
 * — Alexandre Brissos — 2025-10-02
 */
exports.adminLibrariansRouter.post("/admin/libraries/:libraryId/librarians/new", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "library_id");
        const me = req.user;
        if (!(await canManageLibrary(me, libraryId)))
            return res.status(403).json({ error: "forbidden" });
        const { fullName, email, phone, password } = normalizeUserBody(req.body);
        requireFields({ fullName, email }, ["fullName", "email"]);
        const role = await getOrCreateLibrarianRole();
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: String(email) } });
        let user;
        if (!existing) {
            user = await createUserWithPassword({ fullName: String(fullName), email: String(email), phone, password }, 10);
        }
        else {
            user = await updateUserIfChanged(existing, { fullName, phone });
        }
        await ensureUserRole(user.id, role.id);
        await ensureUserLibrary(user.id, libraryId);
        return res.json({ id: user.id, fullName: user.fullName, email: user.email });
    }
    catch (e) {
        const msg = e?.message || "bad_request";
        return res.status(msg.includes("invalid_") ? 400 : 400).json({ error: msg });
    }
});
/**
 * Rota DELETE /admin/libraries/:libraryId/librarians/:userId — remove associação à biblioteca.
 * Não remove o utilizador.
 * — Alexandre Brissos — 2025-10-02
 */
exports.adminLibrariansRouter.delete("/admin/libraries/:libraryId/librarians/:userId", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "library_id");
        const userId = parsePositiveId(req.params.userId, "user_id");
        const me = req.user;
        if (!(await canManageLibrary(me, libraryId)))
            return res.status(403).json({ error: "forbidden" });
        const removed = await detachUserFromLibrary(userId, libraryId);
        if (!removed)
            return res.status(404).json({ error: "not_found" });
        return res.status(204).end();
    }
    catch (e) {
        const msg = e?.message || "bad_request";
        return res.status(msg.includes("invalid_") ? 400 : 400).json({ error: msg });
    }
});
/**
 * Rota POST /admin/librarians — criação administrativa.
 * Body: { fullName, email, phone?, citizenCard?, address?, password, libraryId }
 * Requer ADMIN.
 * — Alexandre Brissos — 2025-10-02
 */
exports.adminLibrariansRouter.post("/admin/librarians", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const user = await createAdminLibrarian(req.body);
        return res.status(201).json(user);
    }
    catch (e) {
        return next(e);
    }
});
exports.default = exports.adminLibrariansRouter;
