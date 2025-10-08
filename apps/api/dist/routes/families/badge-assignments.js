"use strict";
// src/routes/badge-assignments.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista atribuições de emblemas (badges) com filtros por família
// e/ou crianças. Versão TypeScript, com helpers “puros” curtos.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLimit = parseLimit;
exports.parseNum = parseNum;
exports.parseCSVIds = parseCSVIds;
exports.buildWhereBadgeAssignments = buildWhereBadgeAssignments;
exports.mapBadgeRow = mapBadgeRow;
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const router = (0, express_1.Router)();
/* ---------- Helpers puros ---------- */
function parseLimit(v, d = 12, max = 100) {
    const n = Number(v ?? d);
    return Number.isFinite(n) ? Math.min(Math.max(1, Math.trunc(n)), max) : d;
}
function parseNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
function parseCSVIds(v) {
    if (v == null)
        return undefined;
    const arr = String(v)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
    return arr.length ? arr : undefined;
}
function buildWhereBadgeAssignments(q) {
    const childIdFilter = q.childIds?.length ? { in: q.childIds } : q.childId != null ? q.childId : undefined;
    return {
        ...(childIdFilter ? { childId: childIdFilter } : {}),
        ...(q.familyId
            ? { child: { is: { families: { some: { familyId: q.familyId } } } } }
            : {}),
    };
}
function mapBadgeRow(r) {
    return {
        id: `${r.childId}_${r.badgeId}`,
        childId: r.childId,
        childName: r.child?.name ?? null,
        badgeId: r.badgeId,
        name: r.badge?.name ?? null,
        type: r.badge?.type ?? null,
        criteria: r.badge?.criteria ?? null,
        assignedAt: r.assignedAt ? r.assignedAt.toISOString() : null,
    };
}
/* ---------- Handler ---------- */
const getBadgeAssignments = async (req, res, next) => {
    try {
        const limit = parseLimit(req.query.limit, 12);
        const familyId = parseNum(req.query.familyId);
        const childId = parseNum(req.query.childId);
        const childIds = parseCSVIds(req.query.childIds);
        const where = buildWhereBadgeAssignments({ familyId, childId, childIds });
        const rows = await prisma_1.prisma.badgeAssignment.findMany({
            where,
            orderBy: { assignedAt: "desc" },
            take: limit,
            include: {
                child: { select: { id: true, name: true } },
                badge: { select: { id: true, name: true, type: true, criteria: true } },
            },
        });
        res.json(rows.map(mapBadgeRow));
    }
    catch (err) {
        next(err);
    }
};
/* ---------- Rota ---------- */
router.get("/", getBadgeAssignments);
exports.default = router;
