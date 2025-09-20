// apps/api/src/routes/adminMetrics.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { requireRole, ROLES } from "../middlewares/auth";

export const adminMetricsRouter = Router();

/**
 * GET /api/admin/libraries/:libraryId/metrics
 * Resposta:
 * {
 *   weeklyConsultations: { week: string /* ISO do início da semana *\/, count: number }[],
 *   slotUtilization: { date: string /* YYYY-MM-DD *\/, percent: number }[],
 *   activeLibrarians: number,
 *   familiesServed: number
 * }
 */
adminMetricsRouter.get(
  "/admin/libraries/:libraryId/metrics",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN), // admin ou bibliotecário
  async (req, res) => {
    const libraryId = Number(req.params.libraryId);
    if (!Number.isFinite(libraryId) || libraryId <= 0) {
      return res.status(400).json({ error: "invalid_library_id" });
    }

    // se não for admin, tem de pertencer à biblioteca
    const me = (req as any).user as { id: number; roles: string[] } | undefined;
    const isAdmin = (me?.roles || []).some((r) => r.toUpperCase() === ROLES.ADMIN);
    if (!isAdmin) {
      const hasAccess = await prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me!.id, libraryId } },
        select: { userId: true },
      });
      if (!hasAccess) return res.status(403).json({ error: "forbidden" });
    }

    try {
      // ---- Consultas por semana (últimas 12) ----
      const weeklyRows = await prisma.$queryRaw<
        { week: Date; count: number }[]
      >`
        select date_trunc('week', "startAt") as week,
               count(*)::int as count
        from "Consultation"
        where "libraryId" = ${libraryId}
          and "startAt" is not null
          and "startAt" >= now() - interval '12 weeks'
        group by 1
        order by 1 asc
      `;

      const weeklyConsultations = weeklyRows.map((r) => ({
        week: new Date(r.week).toISOString(),
        count: Number(r.count) || 0,
      }));

      // ---- Utilização de slots por dia (últimos 30) ----
      const slotRows = await prisma.$queryRaw<
        { date: Date; open: number; booked: number; blocked: number }[]
      >`
        select date("startAt") as date,
               sum(case when "status" = 'OPEN'    then 1 else 0 end)::int as open,
               sum(case when "status" = 'BOOKED'  then 1 else 0 end)::int as booked,
               sum(case when "status" = 'BLOCKED' then 1 else 0 end)::int as blocked
        from "ConsultationSlot"
        where "libraryId" = ${libraryId}
          and "startAt" >= now() - interval '30 days'
        group by 1
        order by 1 asc
      `;

      const slotUtilization = slotRows.map((r) => {
        const usable = (Number(r.open) || 0) + (Number(r.booked) || 0);
        const pct =
          usable > 0 ? Math.round(((Number(r.booked) || 0) / usable) * 1000) / 10 : 0;
        return {
          date: new Date(r.date).toISOString().slice(0, 10), // YYYY-MM-DD
          percent: pct,
        };
      });

      // ---- Bibliotecários ativos (associados à biblioteca) ----
      const activeLibrarians = await prisma.userLibrary.count({
        where: {
          libraryId,
          user: {
            userRoles: {
              some: {
                role: {
                  name: {
                    in: ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"],
                    mode: "insensitive" as any,
                  },
                },
              },
            },
          },
        },
      });

      // ---- Famílias atendidas (últimos 90 dias; confirmed/completed) ----
      const familiesRows = await prisma.$queryRaw<{ count: number }[]>`
        select count(distinct "familyId")::int as count
        from "Consultation"
        where "libraryId" = ${libraryId}
          and "status" in ('CONFIRMED','COMPLETED')
          and coalesce("startAt","requestedAt") >= now() - interval '90 days'
      `;
      const familiesServed = familiesRows[0]?.count ?? 0;

      return res.json({
        weeklyConsultations,
        slotUtilization,
        activeLibrarians,
        familiesServed,
      });
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: "metrics_failed" });
    }
  }
);
