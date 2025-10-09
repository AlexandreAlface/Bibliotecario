"use strict";
// apps/api/src/routes/adminLibrarians.list.ts
/**
 * Admin — listar bibliotecários de uma biblioteca.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middlewares/auth");
const r = (0, express_1.Router)();
/* ========================= Helpers =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Lê e valida um ID positivo. */
function parsePositiveId(v, field = "id") {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
        const err = new Error(`${field}_inválido`);
        err.status = 400;
        throw err;
    }
    return n;
}
/** Determina se o utilizador é ADMIN. */
function isAdmin(me) {
    return Boolean(me?.roles?.some((r) => r?.toUpperCase() === auth_1.ROLES.ADMIN));
}
/** Verifica se o utilizador (não-admin) pertence à biblioteca. */
async function assertLibraryAccess(me, libraryId) {
    if (isAdmin(me))
        return;
    if (!me?.id) {
        const err = new Error("forbidden");
        err.status = 403;
        throw err;
    }
    const link = await prisma_1.prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me.id, libraryId } },
        select: { userId: true },
    });
    if (!link) {
        const err = new Error("forbidden");
        err.status = 403;
        throw err;
    }
}
/* ========================= Rota =========================
 * GET /admin/libraries/:libraryId/librarians
 * Query:
 *  - q?: string  (filtra por fullName/email)
 *
 * Resposta: [{ id, fullName, email }]
 * — mantém forma para compat com o FE atual.
 */
r.get("/admin/libraries/:libraryId/librarians", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res, next) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
        const me = req.user;
        // Librarians só podem ver as suas bibliotecas; admins podem ver todas
        await assertLibraryAccess(me, libraryId);
        const q = String(req.query.q ?? "").trim();
        const LIBRARIAN_ALIASES = [
            auth_1.ROLES.LIBRARIAN,
            "BIBLIOTECÁRIO",
            "BIBLIOTECARIO",
        ];
        const where = {
            userLibraries: { some: { libraryId } },
            userRoles: { some: { role: { name: { in: LIBRARIAN_ALIASES } } } },
            ...(q
                ? {
                    OR: [
                        { fullName: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const items = await prisma_1.prisma.user.findMany({
            where,
            select: { id: true, fullName: true, email: true },
            orderBy: [{ fullName: "asc" }, { id: "asc" }],
        });
        res.json(items);
    }
    catch (e) {
        return res
            .status(e?.status || 500)
            .json({ error: e?.message || "internal_error" });
    }
});
exports.default = r;
