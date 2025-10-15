"use strict";
// apps/api/src/routes/librarian-families.ts
// Autor: Alexandre Brissos 21131
// O que faz: endpoints para bibliotecários consultarem famílias.
// Melhorias: extraí helpers *puros* (parse/mapeamento/where), handlers < 30 linhas,
// tipagem explícita e projeções consistentes.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middlewares/auth");
const client_1 = require("@prisma/client");
const r = (0, express_1.Router)();
/* -------------------- Helpers PUROS -------------------- */
const toLimit = (v, def = 25, max = 50) => Math.min(Number(v ?? def) || def, max);
const toCursor = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const toSearch = (v) => String(v ?? "").trim();
const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const buildFamilyWhere = (roleId, q, libraryId) => ({
    userRoles: { some: { roleId } },
    ...(libraryId ? { userLibraries: { some: { libraryId } } } : {}),
    ...(q
        ? {
            OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
            ],
        }
        : {}),
});
const mapFamilyListItem = (u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    childrenCount: u.children.length,
});
/* -------------------- Rotas (<30 linhas) -------------------- */
// GET /api/librarian/families?search=&limit=25&cursor=ID
r.get("/families", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const limit = toLimit(req.query.limit, 25, 50);
        const cursor = toCursor(req.query.cursor);
        const q = toSearch(req.query.search);
        const libraryId = toInt(req.query.libraryId); // 👈 filtro por biblioteca
        const role = await prisma_1.prisma.role.findFirst({ where: { name: "FAMÍLIA" } });
        if (!role)
            return res.json({ items: [], nextCursor: null });
        const items = await prisma_1.prisma.user.findMany({
            where: buildFamilyWhere(role.id, q, libraryId),
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: [{ fullName: "asc" }, { id: "asc" }], // 👈 UX melhor
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                children: { select: { childId: true } },
            },
        });
        const hasMore = items.length > limit;
        if (hasMore)
            items.pop();
        res.json({
            items: items.map(mapFamilyListItem),
            nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
        });
    }
    catch (e) {
        next(e);
    }
});
// GET /api/librarian/families/:id (detalhe completo)
r.get("/families/:id", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id))
            return res.status(400).json({ error: "invalid_id" });
        const family = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                children: {
                    select: {
                        child: { select: { id: true, name: true, birthDate: true } },
                    },
                    orderBy: { childId: "asc" },
                },
            },
        });
        if (!family)
            return res.status(404).json({ error: "not_found" });
        const children = family.children.map((cf) => cf.child);
        const childIds = children.map((c) => c.id);
        const now = new Date();
        const [upcomingConsults, recentConsults, badges, readings, reservations, ratings,] = await Promise.all([
            prisma_1.prisma.consultation.findMany({
                where: {
                    familyId: id,
                    status: {
                        in: [
                            client_1.$Enums.ConsultationStatus.PENDING,
                            client_1.$Enums.ConsultationStatus.CONFIRMED,
                        ],
                    },
                    startAt: { gte: now },
                },
                orderBy: { startAt: "asc" },
                take: 8,
                select: {
                    id: true,
                    status: true,
                    startAt: true,
                    endAt: true,
                    child: { select: { id: true, name: true } },
                    librarian: { select: { id: true, fullName: true } },
                    library: { select: { id: true, name: true } },
                },
            }),
            prisma_1.prisma.consultation.findMany({
                where: {
                    familyId: id,
                    status: {
                        in: [
                            client_1.$Enums.ConsultationStatus.COMPLETED,
                            client_1.$Enums.ConsultationStatus.CANCELLED,
                            client_1.$Enums.ConsultationStatus.DECLINED,
                        ],
                    },
                },
                orderBy: [{ startAt: "desc" }, { requestedAt: "desc" }],
                take: 12,
                select: {
                    id: true,
                    status: true,
                    startAt: true,
                    endAt: true,
                    requestedAt: true,
                    child: { select: { id: true, name: true } },
                    librarian: { select: { id: true, fullName: true } },
                    library: { select: { id: true, name: true } },
                },
            }),
            prisma_1.prisma.badgeAssignment.findMany({
                where: { childId: { in: childIds } },
                orderBy: { assignedAt: "desc" },
                take: 40,
                select: {
                    assignedAt: true,
                    childId: true,
                    badge: { select: { id: true, name: true, type: true } },
                },
            }),
            prisma_1.prisma.reading.findMany({
                where: { childId: { in: childIds }, finishedAt: null },
                orderBy: { startedAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    childId: true,
                    startedAt: true,
                    book: {
                        select: { isbn: true, title: true, author: true, coverUrl: true },
                    },
                },
            }),
            prisma_1.prisma.bookReservation.findMany({
                where: { childId: { in: childIds } },
                orderBy: { reservedAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    childId: true,
                    reservedAt: true,
                    book: {
                        select: { isbn: true, title: true, author: true, coverUrl: true },
                    },
                },
            }),
            prisma_1.prisma.rating.findMany({
                where: { userId: id },
                orderBy: { ratedAt: "desc" },
                take: 20,
                select: {
                    id: true,
                    stars: true,
                    comment: true,
                    ratedAt: true,
                    childId: true,
                    book: {
                        select: { isbn: true, title: true, author: true, coverUrl: true },
                    },
                },
            }),
        ]);
        res.json({
            family: {
                id: family.id,
                fullName: family.fullName,
                email: family.email,
                phone: family.phone,
                address: family.address,
            },
            children,
            badges,
            readings,
            reservations,
            ratings,
            upcomingConsultations: upcomingConsults,
            recentConsultations: recentConsults,
        });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
