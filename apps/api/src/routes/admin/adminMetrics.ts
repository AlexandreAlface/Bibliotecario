// apps/api/src/routes/adminMetrics.ts
// Autor: Alexandre Brissos 21131

import { Router } from "express";
import { prisma } from "../../prisma";
import { requireRole, ROLES } from "../../middlewares/auth";

export const adminMetricsRouter = Router();

/** Lê e valida um ID numérico positivo (lança 400 em erro). */
function parseLibraryId(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    const err: any = new Error("invalid_library_id");
    err.status = 400;
    throw err;
  }
  return n;
}

/** Indica se o utilizador tem o role ADMIN. */
function isAdminUser(me?: { roles?: string[] }) {
  return !!me?.roles?.some((r) => r?.toUpperCase() === ROLES.ADMIN);
}

// ---------- NOVO: helpers para datas ISO (curtos e puros) ----------
function parseISOOrThrow(v?: string) {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    const err: any = new Error("invalid_date");
    err.status = 400;
    throw err;
  }
  return d.toISOString();
}


/** Garante acesso do utilizador à biblioteca (admins passam sempre). */
async function ensureAccess(
  me: { id: number; roles: string[] } | undefined,
  libraryId: number
) {
  if (isAdminUser(me)) return;
  const link = await prisma.userLibrary.findUnique({
    where: { userId_libraryId: { userId: me!.id, libraryId } },
    select: { userId: true },
  });
  if (!link) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

/** Devolve contagem semanal de consultas (últimas 12 semanas). */
async function selectWeeklyConsultations(libraryId: number) {
  const rows = await prisma.$queryRaw<{ week: Date; count: number }[]>`
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
async function selectSlotUtilization(libraryId: number) {
  const rows = await prisma.$queryRaw<
    { date: Date; open: number; booked: number; blocked: number }[]
  >`
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
    const percent =
      usable > 0 ? Math.round(((r.booked || 0) / usable) * 1000) / 10 : 0;
    return { date: new Date(r.date).toISOString().slice(0, 10), percent };
  });
}

/** Conta bibliotecários ativos associados à biblioteca (com aliases de role). */
async function countActiveLibrarians(libraryId: number) {
  const aliases = ["LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO"];
  const orNameEqInsensitive = aliases.map((name) => ({
    role: { name: { equals: name, mode: "insensitive" as const } },
  }));
  return prisma.userLibrary.count({
    where: {
      libraryId,
      user: { userRoles: { some: { OR: orNameEqInsensitive } } },
    },
  });
}

/** Conta famílias atendidas (distinct familyId) nos últimos 90 dias. */
async function countFamiliesServed(libraryId: number) {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
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
adminMetricsRouter.get(
  "/admin/libraries/:libraryId/metrics",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  async (req, res) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const me = (req as any).user as { id: number; roles: string[] } | undefined;
      await ensureAccess(me, libraryId);

      const [weeklyConsultations, slotUtilization, activeLibrarians, familiesServed] =
        await Promise.all([
          selectWeeklyConsultations(libraryId),
          selectSlotUtilization(libraryId),
          countActiveLibrarians(libraryId),
          countFamiliesServed(libraryId),
        ]);

      res.json({ weeklyConsultations, slotUtilization, activeLibrarians, familiesServed });
    } catch (e: any) {
      const status = e?.status || 500;
      res.status(status).json({ error: e?.message || "metrics_failed" });
    }
  }
);

// ---------- NOVO: agregações SQL otimizadas ----------
async function selectStatusCounts(libraryId: number, from?: string, to?: string) {
  const rows = await prisma.$queryRaw<{ status: string; count: number }[]>`
    select "status", count(*)::int as count
    from "Consultation"
    where "libraryId" = ${libraryId}
      and coalesce("startAt","requestedAt") >= coalesce(${from}::timestamptz, now() - interval '12 weeks')
      and coalesce("startAt","requestedAt") <= coalesce(${to}::timestamptz, now())
    group by 1
  `;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = Number(r.count) || 0;
  return out;
}

async function selectWeekdayCounts(libraryId: number, from?: string, to?: string) {
  const rows = await prisma.$queryRaw<{ dow: number; count: number }[]>`
    select extract(dow from coalesce("startAt","requestedAt"))::int as dow,
           count(*)::int as count
    from "Consultation"
    where "libraryId" = ${libraryId}
      and coalesce("startAt","requestedAt") >= coalesce(${from}::timestamptz, now() - interval '12 weeks')
      and coalesce("startAt","requestedAt") <= coalesce(${to}::timestamptz, now())
    group by 1
    order by 1
  `;
  return rows;
}

async function selectHourlyCounts(libraryId: number, from?: string, to?: string) {
  const rows = await prisma.$queryRaw<{ hour: number; count: number }[]>`
    select extract(hour from "startAt")::int as hour,
           count(*)::int as count
    from "Consultation"
    where "libraryId" = ${libraryId}
      and "startAt" is not null
      and "startAt" >= coalesce(${from}::timestamptz, now() - interval '12 weeks')
      and "startAt" <= coalesce(${to}::timestamptz, now())
    group by 1
    order by 1
  `;
  return rows;
}

async function selectLeadHistogram(libraryId: number, from?: string, to?: string) {
  const rows = await prisma.$queryRaw<{ bucket: string; count: number }[]>`
    with diffs as (
      select greatest(0, extract(epoch from ("startAt" - "requestedAt")) / 86400.0) as days
      from "Consultation"
      where "libraryId" = ${libraryId}
        and "startAt" is not null and "requestedAt" is not null
        and "startAt" >= coalesce(${from}::timestamptz, now() - interval '12 weeks')
        and "startAt" <= coalesce(${to}::timestamptz, now())
    )
    select
      case
        when days < 2 then '0–1'
        when days < 4 then '2–3'
        when days < 8 then '4–7'
        when days < 15 then '8–14'
        else '15+'
      end as bucket,
      count(*)::int as count
    from diffs
    group by 1
    order by min(days)
  `;
  // garantir ordem e zeros
  const order = ['0–1','2–3','4–7','8–14','15+'];
  const map = new Map(rows.map(r => [r.bucket, r.count]));
  return order.map(b => ({ bucket: b, count: map.get(b) || 0 }));
}

// ---------- NOVO: endpoint breakdown ----------
/**
 * GET /admin/libraries/:libraryId/metrics/breakdown?from=ISO&to=ISO
 * Retorna: { status, weekday, hourly, leadHistogram }
 */
adminMetricsRouter.get(
  "/admin/libraries/:libraryId/metrics/breakdown",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  async (req, res) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const me = (req as any).user as { id: number; roles: string[] } | undefined;
      await ensureAccess(me, libraryId);

      const from = parseISOOrThrow(req.query.from as string | undefined);
      const to = parseISOOrThrow(req.query.to as string | undefined);

      const [status, weekday, hourly, leadHistogram] = await Promise.all([
        selectStatusCounts(libraryId, from, to),
        selectWeekdayCounts(libraryId, from, to),
        selectHourlyCounts(libraryId, from, to),
        selectLeadHistogram(libraryId, from, to),
      ]);

      res.json({ status, weekday, hourly, leadHistogram });
    } catch (e: any) {
      const statusCode = e?.status || 500;
      res.status(statusCode).json({ error: e?.message || "metrics_breakdown_failed" });
    }
  }
);

export default adminMetricsRouter;
