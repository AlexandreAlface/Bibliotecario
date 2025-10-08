// src/routes/badge-assignments.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista atribuições de emblemas (badges) com filtros por família
// e/ou crianças. Versão TypeScript, com helpers “puros” curtos.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import { prisma } from "../../prisma";
import type { Prisma } from "@prisma/client";

const router = Router();

/* ---------- Helpers puros ---------- */
export function parseLimit(v: unknown, d = 12, max = 100): number {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? Math.min(Math.max(1, Math.trunc(n)), max) : d;
}
export function parseNum(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
export function parseCSVIds(v: unknown): number[] | undefined {
  if (v == null) return undefined;
  const arr = String(v)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return arr.length ? arr : undefined;
}
export function buildWhereBadgeAssignments(q: {
  familyId?: number;
  childId?: number;
  childIds?: number[];
}): Prisma.BadgeAssignmentWhereInput {
  const childIdFilter =
    q.childIds?.length ? { in: q.childIds } : q.childId != null ? q.childId : undefined;
  return {
    ...(childIdFilter ? { childId: childIdFilter } : {}),
    ...(q.familyId
      ? { child: { is: { families: { some: { familyId: q.familyId } } } } }
      : {}),
  };
}
export function mapBadgeRow(r: {
  childId: number;
  badgeId: number;
  assignedAt: Date | null;
  child?: { id: number; name: string | null } | null;
  badge?: { id: number; name: string; type: string; criteria: string } | null;
}) {
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
const getBadgeAssignments: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseLimit(req.query.limit, 12);
    const familyId = parseNum(req.query.familyId);
    const childId = parseNum(req.query.childId);
    const childIds = parseCSVIds(req.query.childIds);

    const where = buildWhereBadgeAssignments({ familyId, childId, childIds });

    const rows = await prisma.badgeAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      take: limit,
      include: {
        child: { select: { id: true, name: true } },
        badge: { select: { id: true, name: true, type: true, criteria: true } },
      },
    });

    res.json(rows.map(mapBadgeRow));
  } catch (err) {
    next(err);
  }
};

/* ---------- Rota ---------- */
router.get("/", getBadgeAssignments);

export default router;
