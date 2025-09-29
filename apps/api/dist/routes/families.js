"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middlewares/auth");
const prisma = new client_1.PrismaClient();
const r = (0, express_1.Router)();
// GET /api/librarian/families?search=&limit=25&cursor=ID
r.get("/families", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const q = String(req.query.search || "").trim();
    const roleFamily = await prisma.role.findFirst({ where: { name: "FAMÍLIA" } });
    if (!roleFamily)
        return res.json({ items: [], nextCursor: null });
    const baseWhere = {
        userRoles: { some: { roleId: roleFamily.id } },
        ...(q
            ? {
                OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const items = await prisma.user.findMany({
        where: baseWhere,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ id: "asc" }],
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            children: { select: { childId: true } },
        },
    });
    const next = items.length > limit ? items.pop() : null;
    res.json({
        items: items.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            childrenCount: u.children.length,
        })),
        nextCursor: next?.id ?? null,
    });
});
// GET /api/librarian/families/:id (detalhe completo)
r.get("/families/:id", auth_1.withUser, (0, auth_1.requireRole)(auth_1.ROLES.LIBRARIAN, auth_1.ROLES.ADMIN), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ error: "invalid_id" });
    const family = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            children: {
                select: {
                    child: {
                        select: { id: true, name: true, birthDate: true },
                    },
                },
                orderBy: { childId: "asc" },
            },
        },
    });
    if (!family)
        return res.status(404).json({ error: "not_found" });
    // filhos planos
    const children = family.children.map((cf) => cf.child);
    const now = new Date();
    // consultas
    const [upcomingConsults, recentConsults] = await Promise.all([
        prisma.consultation.findMany({
            where: {
                familyId: id,
                status: { in: [client_1.$Enums.ConsultationStatus.PENDING, client_1.$Enums.ConsultationStatus.CONFIRMED] },
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
        prisma.consultation.findMany({
            where: {
                familyId: id,
                status: { in: [client_1.$Enums.ConsultationStatus.COMPLETED, client_1.$Enums.ConsultationStatus.CANCELLED, client_1.$Enums.ConsultationStatus.DECLINED] },
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
    ]);
    // conquistas (badges)
    const badges = await prisma.badgeAssignment.findMany({
        where: { childId: { in: children.map((c) => c.id) } },
        orderBy: { assignedAt: "desc" },
        take: 40,
        select: {
            assignedAt: true,
            childId: true,
            badge: { select: { id: true, name: true, type: true } },
        },
    });
    // leituras em curso (sem finishedAt)
    const readings = await prisma.reading.findMany({
        where: { childId: { in: children.map((c) => c.id) }, finishedAt: null },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
            id: true,
            childId: true,
            startedAt: true,
            book: { select: { isbn: true, title: true, author: true, coverUrl: true } },
        },
    });
    // reservas de livros ativas
    const reservations = await prisma.bookReservation.findMany({
        where: { childId: { in: children.map((c) => c.id) } },
        orderBy: { reservedAt: "desc" },
        take: 20,
        select: {
            id: true,
            childId: true,
            reservedAt: true,
            book: { select: { isbn: true, title: true, author: true, coverUrl: true } },
        },
    });
    // avaliações
    const ratings = await prisma.rating.findMany({
        where: { userId: id },
        orderBy: { ratedAt: "desc" },
        take: 20,
        select: {
            id: true,
            stars: true,
            comment: true,
            ratedAt: true,
            childId: true,
            book: { select: { isbn: true, title: true, author: true, coverUrl: true } },
        },
    });
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
});
exports.default = r;
