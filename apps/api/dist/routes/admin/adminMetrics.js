"use strict";
// apps/api/src/routes/adminMetrics.ts
// Autor: Alexandre Brissos 21131
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMetricsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const auth_1 = require("../../middlewares/auth");
exports.adminMetricsRouter = (0, express_1.Router)();
/** Lê e valida um ID numérico positivo (lança 400 em erro). */
function parseLibraryId(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
        const err = new Error("invalid_library_id");
        err.status = 400;
        throw err;
    }
    return n;
}
/** Indica se o utilizador tem o role ADMIN. */
function isAdminUser(me) {
    return !!me?.roles?.some((r) => r?.toUpperCase() === auth_1.ROLES.ADMIN);
}
/** Garante acesso do utilizador à biblioteca (admins passam sempre). */
async function ensureAccess(me, libraryId) {
    if (isAdminUser(me))
        return;
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
/** Devolve contagem semanal de consultas (últimas 12 semanas). */
async function selectWeeklyConsultations(libraryId) {
    const rows = await prisma_1.prisma.$queryRaw `
    select date_trunc('week',"startAt") as week, count(*)::int as count
    from "Consultation"
    where "libraryId" = ${libraryId}
      and "startAt" is not null
      and "startAt" >= now() - interval '12 weeks'
    group by 1
    order by 1 asc
  `;
    return rows.map((r) => ({
        week: new Date(r.week).toISOString(),
        count: Number(r.count) || 0,
    }));
}
/** Calcula percentagem de utilização de slots por dia (últimos 30 dias). */
async function selectSlotUtilization(libraryId) {
    const rows = await prisma_1.prisma.$queryRaw `
    select date("startAt") as date,
           sum(case when "status"='OPEN' then 1 else 0 end)::int   as open,
           sum(case when "status"='BOOKED' then 1 else 0 end)::int as booked,
           sum(case when "status"='BLOCKED' then 1 else 0 end)::int as blocked
    from "ConsultationSlot"
    where "libraryId" = ${libraryId}
      and "startAt" >= now() - interval '30 days'
    group by 1
    order by 1 asc
  `;
    return rows.map((r) => {
        const usable = (r.open || 0) + (r.booked || 0);
        const percent = usable > 0 ? Math.round(((r.booked || 0) / usable) * 1000) / 10 : 0;
        return { date: new Date(r.date).toISOString().slice(0, 10), percent };
    });
}
/** Conta bibliotecários ativos associados à biblioteca (com aliases de role). */
async function countActiveLibrarians(libraryId) {
    const aliases = ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"];
    const orNameEqInsensitive = aliases.map((name) => ({
        role: { name: { equals: name, mode: "insensitive" } },
    }));
    return prisma_1.prisma.userLibrary.count({
        where: {
            libraryId,
            user: { userRoles: { some: { OR: orNameEqInsensitive } } },
        },
    });
}
/** Conta famílias atendidas (distinct familyId) nos últimos 90 dias. */
async function countFamiliesServed(libraryId) {
    const rows = await prisma_1.prisma.$queryRaw `
    select count(distinct "familyId")::int as count
    from "Consultation"
    where "libraryId" = ${libraryId}
      and "status" in ('CONFIRMED','COMPLETED')
      and coalesce("startAt","requestedAt") >= now() - interval '90 days'
  `;
    return rows[0]?.count ?? 0;
}
/**
 * GET /admin/libraries/:libraryId/metrics
 * Retorna: weeklyConsultations, slotUtilization, activeLibrarians, familiesServed
 */
exports.adminMetricsRouter.get("/admin/libraries/:libraryId/metrics", (0, auth_1.requireRole)(auth_1.ROLES.ADMIN, auth_1.ROLES.LIBRARIAN), async (req, res) => {
    try {
        const libraryId = parseLibraryId(req.params.libraryId);
        const me = req.user;
        await ensureAccess(me, libraryId);
        const [weeklyConsultations, slotUtilization, activeLibrarians, familiesServed] = await Promise.all([
            selectWeeklyConsultations(libraryId),
            selectSlotUtilization(libraryId),
            countActiveLibrarians(libraryId),
            countFamiliesServed(libraryId),
        ]);
        res.json({ weeklyConsultations, slotUtilization, activeLibrarians, familiesServed });
    }
    catch (e) {
        const status = e?.status || 500;
        res.status(status).json({ error: e?.message || "metrics_failed" });
    }
});
exports.default = exports.adminMetricsRouter;
