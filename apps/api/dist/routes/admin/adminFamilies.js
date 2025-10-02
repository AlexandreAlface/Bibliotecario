"use strict";
/**
 * Admin — listagem de famílias por biblioteca (com filtros e paginação).
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Rota mantida. Extraí helpers “puros” e normalizei DTOs. Handler ≤ 30 linhas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.r = void 0;
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middlewares/auth");
exports.r = (0, express_1.Router)();
/* ========================= Helpers puros =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** ID positivo obrigatório. — Alexandre Brissos — 2025-10-02 */
function parsePositiveId(v, field = "id") {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0)
        throw new Error(`invalid_${field}`);
    return n;
}
/** Utilizador é ADMIN? — Alexandre Brissos — 2025-10-02 */
function isAdmin(me) {
    return !!me?.roles?.some((r) => r?.toUpperCase() === auth_1.ROLES.ADMIN);
}
/** Calcula idade (anos inteiros). — Alexandre Brissos — 2025-10-02 */
function ageInYears(birth, ref = new Date()) {
    let a = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate()))
        a--;
    return a;
}
/** Data de hoje menos N anos. — Alexandre Brissos — 2025-10-02 */
function yearsAgo(n) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d;
}
/**
 * Lê e valida query params de filtros/paginação. — Alexandre Brissos — 2025-10-02
 */
function parseQuery(q) {
    const out = {
        q: String(q.q ?? "").trim(),
        childName: String(q.child ?? "").trim(),
        gender: String(q.gender ?? "").trim(),
        ageMin: q.ageMin != null ? Number(q.ageMin) : undefined,
        ageMax: q.ageMax != null ? Number(q.ageMax) : undefined,
        hasChildren: String(q.hasChildren ?? "").toLowerCase(),
        limit: Math.min(Math.max(parseInt(String(q.limit ?? 25), 10) || 25, 1), 100),
        cursor: q.cursor ? Number(q.cursor) : null,
    };
    if ((q.ageMin != null && Number.isNaN(out.ageMin)) || (q.ageMax != null && Number.isNaN(out.ageMax)))
        throw Object.assign(new Error("invalid_age_filter"), { status: 400 });
    return out;
}
/** Janela de nascimento a partir de idade. — Alexandre Brissos — 2025-10-02 */
function birthRangeFromAges(ageMin, ageMax) {
    let birthFrom;
    let birthTo;
    if (typeof ageMin === "number")
        birthTo = yearsAgo(ageMin); // <= birthTo
    if (typeof ageMax === "number")
        birthFrom = yearsAgo(ageMax); // >= birthFrom
    return { birthFrom, birthTo };
}
/** Construção do filtro de filhos. — Alexandre Brissos — 2025-10-02 */
function buildChildWhere(childName, gender, birthFrom, birthTo) {
    const w = {};
    if (childName)
        w.name = { contains: childName, mode: "insensitive" };
    if (gender)
        w.gender = { contains: gender, mode: "insensitive" };
    if (birthFrom || birthTo)
        w.birthDate = { ...(birthFrom ? { gte: birthFrom } : {}), ...(birthTo ? { lte: birthTo } : {}) };
    return w;
}
/** Filtro principal de famílias da biblioteca. — Alexandre Brissos — 2025-10-02 */
function buildFamiliesWhere(libraryId, q, cursor, hasChildren, childWhere) {
    const FAMILY_ALIASES = ["FAMILY", "FAMÍLIA", "FAMILIA"];
    const where = {
        userLibraries: { some: { libraryId } },
        userRoles: { some: { role: { name: { in: FAMILY_ALIASES } } } },
        ...(q
            ? {
                OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                    { address: { contains: q, mode: "insensitive" } },
                ],
            }
            : {}),
        ...(cursor ? { id: { gt: cursor } } : {}),
    };
    if (Object.keys(childWhere).length)
        where.children = { some: { child: childWhere } };
    else if (hasChildren === "true")
        where.children = { some: {} };
    else if (hasChildren === "false")
        where.children = { none: {} };
    return where;
}
/** Mapeia user+children → DTO de resposta. — Alexandre Brissos — 2025-10-02 */
function userToDto(u) {
    const children = (u.children || []).map((cf) => {
        const c = cf.child;
        return {
            id: c.id,
            name: c.name,
            birthDate: c.birthDate.toISOString(),
            gender: c.gender,
            ageYears: ageInYears(c.birthDate),
            readingsCount: c._count.readings,
            ratingsCount: c._count.ratings,
        };
    });
    return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone ?? null,
        address: u.address ?? null,
        childrenCount: u._count.children,
        children,
    };
}
/* ========================= Helpers com efeitos (DB) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/** Verifica acesso do request à biblioteca se não for ADMIN. — Alexandre Brissos — 2025-10-02 */
async function ensureAccess(me, libraryId) {
    if (isAdmin(me))
        return true;
    if (!me?.id)
        return false;
    const link = await prisma_1.prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me.id, libraryId } },
        select: { userId: true },
    });
    return !!link;
}
/** Query ao Prisma (limit+1 para cursor). — Alexandre Brissos — 2025-10-02 */
async function fetchFamilies(where, limit) {
    return prisma_1.prisma.user.findMany({
        where,
        orderBy: { id: "asc" },
        take: limit + 1,
        select: {
            id: true, fullName: true, email: true, phone: true, address: true,
            children: { select: { child: { select: { id: true, name: true, birthDate: true, gender: true, _count: { select: { readings: true, ratings: true } } } } } },
            _count: { select: { children: true } },
        },
    });
}
/* ========================= Rota (inalterada) =========================
 * — Alexandre Brissos — 2025-10-02
 */
/**
 * GET /admin/libraries/:libraryId/families — lista famílias com filtros e paginação cursor.
 * — Alexandre Brissos — 2025-10-02
 */
exports.r.get("/admin/libraries/:libraryId/families", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res) => {
    try {
        const libraryId = parsePositiveId(req.params.libraryId, "library_id");
        const me = req.user;
        if (!(await ensureAccess(me, libraryId)))
            return res.status(403).json({ error: "forbidden" });
        const { q, childName, gender, ageMin, ageMax, hasChildren, limit, cursor } = parseQuery(req.query);
        const { birthFrom, birthTo } = birthRangeFromAges(ageMin, ageMax);
        const childWhere = buildChildWhere(childName, gender, birthFrom, birthTo);
        const where = buildFamiliesWhere(libraryId, q, cursor, hasChildren, childWhere);
        const rows = await fetchFamilies(where, limit);
        const items = rows.slice(0, limit).map(userToDto);
        const nextCursor = rows.length > limit ? rows[limit].id : null;
        return res.json({ items, nextCursor });
    }
    catch (e) {
        const msg = e?.message || "bad_request";
        const status = msg.startsWith("invalid_") ? 400 : (e?.status || 500);
        return res.status(status).json({ error: msg });
    }
});
exports.default = exports.r;
