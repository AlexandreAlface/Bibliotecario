"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFamilyOrLibrarian = exports.ROLES = void 0;
exports.withUser = withUser;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireAnyRole = requireAnyRole;
exports.requireSelfOrRole = requireSelfOrRole;
exports.ensureLibrarianOwnsParam = ensureLibrarianOwnsParam;
exports.ensureFamilyOwnsBodyField = ensureFamilyOwnsBodyField;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// --- Roles canónicos ---
exports.ROLES = {
    FAMILY: "FAMÍLIA",
    LIBRARIAN: "BIBLIOTECÁRIO",
    CHILD: "CRIANÇA",
    ADMIN: "ADMIN",
};
// ------------ utils ------------
function toAuthUser(u) {
    const roleNames = (u.userRoles ?? [])
        .map((ur) => ur?.role?.name)
        .filter(Boolean);
    return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roles: roleNames,
        isFamily: roleNames.includes(exports.ROLES.FAMILY),
        isLibrarian: roleNames.includes(exports.ROLES.LIBRARIAN),
        isChild: roleNames.includes(exports.ROLES.CHILD),
        isAdmin: roleNames.includes(exports.ROLES.ADMIN),
    };
}
function unauthorized(res, msg = "unauthenticated") {
    return res.status(401).json({ error: msg });
}
function forbidden(res, msg = "forbidden") {
    return res.status(403).json({ error: msg });
}
// ------------ middleware brando (NÃO devolve 401) ------------
/**
 * withUser
 * - Tenta ler Bearer token ou cookie httpOnly
 * - Se existir e for válido, carrega utilizador + roles (req.user)
 * - Se não existir ou for inválido, segue sem bloquear (req.user = null)
 * - actingChildId: lê header `x-acting-child-id` OU cookie `bf_acting` (apenas família)
 */
async function withUser(req, _res, next) {
    const COOKIE_NAME = process.env.COOKIE_NAME || "bf_access";
    const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
    const secret = process.env.JWT_SECRET;
    req.user = null;
    req.actingChildId = null;
    try {
        // 1) Authorization: Bearer
        let token;
        const h = req.header("authorization") || req.header("Authorization");
        if (h?.startsWith("Bearer "))
            token = h.slice(7).trim();
        // 2) Cookie httpOnly
        if (!token && req.cookies?.[COOKIE_NAME]) {
            token = req.cookies[COOKIE_NAME];
        }
        if (!token || !secret)
            return next(); // segue sem user
        // Verifica token
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, secret);
        }
        catch {
            return next(); // token inválido → segue sem user
        }
        // Extrai userId de várias formas (id | sub | userId)
        const userId = typeof payload.id === "number"
            ? payload.id
            : typeof payload.sub === "number"
                ? payload.sub
                : typeof payload.sub === "string" && /^\d+$/.test(payload.sub)
                    ? Number(payload.sub)
                    : typeof payload.userId === "number"
                        ? payload.userId
                        : undefined;
        if (!Number.isFinite(userId))
            return next();
        // Carrega utilizador + roles
        const dbUser = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { userRoles: { include: { role: true } } },
        });
        if (!dbUser)
            return next();
        req.user = toAuthUser(dbUser);
        // Acting child (header ou cookie), apenas para FAMILY
        if (req.user.isFamily) {
            const actingHeader = req.header("x-acting-child-id");
            const actingCookie = req.cookies?.[ACTING_COOKIE];
            const candidate = actingHeader ?? actingCookie;
            if (candidate) {
                const childId = Number(candidate);
                if (Number.isFinite(childId)) {
                    const link = await prisma.childFamily.findUnique({
                        where: { childId_familyId: { childId, familyId: req.user.id } },
                        select: { childId: true },
                    });
                    req.actingChildId = link ? childId : null;
                }
            }
        }
        next();
    }
    catch (e) {
        // Não bloquear requests públicos por erros no withUser
        console.warn("withUser error:", e);
        return next();
    }
}
// ------------ guards (estes SIM devolvem 401/403) ------------
function requireAuth(req, res, next) {
    if (!req.user)
        return unauthorized(res);
    next();
}
function requireRole(...allowed) {
    return (req, res, next) => {
        if (!req.user)
            return unauthorized(res);
        const ok = req.user.roles.some((r) => allowed.includes(r));
        if (!ok)
            return forbidden(res);
        next();
    };
}
function requireAnyRole(...allowed) {
    return requireRole(...allowed);
}
exports.requireFamilyOrLibrarian = requireRole(exports.ROLES.FAMILY, exports.ROLES.LIBRARIAN, exports.ROLES.ADMIN);
/**
 * requireSelfOrRole:
 * - Se o recurso pertencer ao req.user.id → passa
 * - Senão, precisa de um dos roles permitidos
 */
function requireSelfOrRole(getOwnerId, ...allowed) {
    return (req, res, next) => {
        if (!req.user)
            return unauthorized(res);
        const ownerId = getOwnerId(req);
        if (ownerId && ownerId === req.user.id)
            return next();
        const ok = req.user.roles.some((r) => allowed.includes(r));
        if (!ok)
            return forbidden(res);
        next();
    };
}
// ------- ownership helpers -------
function ensureLibrarianOwnsParam(param = "librarianId") {
    return (req, res, next) => {
        if (!req.user)
            return unauthorized(res);
        if (!req.user.isLibrarian && !req.user.isAdmin)
            return forbidden(res);
        const id = Number(req.params[param]);
        if (!Number.isFinite(id))
            return res.status(400).json({ error: "invalid id" });
        if (req.user.isAdmin || req.user.id === id)
            return next();
        return forbidden(res);
    };
}
function ensureFamilyOwnsBodyField(field = "familyId") {
    return (req, res, next) => {
        if (!req.user)
            return unauthorized(res);
        if (!req.user.isFamily && !req.user.isAdmin)
            return forbidden(res);
        const id = Number((req.body ?? {})[field]);
        if (!Number.isFinite(id))
            return res.status(400).json({ error: "invalid familyId" });
        if (req.user.isAdmin || req.user.id === id)
            return next();
        return forbidden(res);
    };
}
