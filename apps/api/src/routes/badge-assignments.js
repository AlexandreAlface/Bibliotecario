import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

/**
 * GET /api/badge-assignments
 * Query:
 *  - limit?: number (default 12)
 *  - familyId?: number          // todas as crianças dessa família
 *  - childId?: number           // uma criança
 *  - childIds?: "2,3,5"         // várias crianças (CSV)
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 12);
    const familyId = req.query.familyId ? Number(req.query.familyId) : undefined;
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    const childIds = req.query.childIds
      ? String(req.query.childIds)
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : undefined;

    // WHERE dinâmico
    const where = {};
    if (childId) where.childId = childId;
    if (childIds?.length) where.childId = { in: childIds };
    if (familyId) {
      // BadgeAssignment -> Child (1) -> families (N)
      where.child = { is: { families: { some: { familyId } } } };
    }

    const rows = await prisma.badgeAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      take: limit,
      include: {
        child: { select: { id: true, name: true } },
        badge: { select: { id: true, name: true, type: true, criteria: true } },
      },
    });

    res.json(
      rows.map((r) => ({
        id: `${r.childId}_${r.badgeId}`,   // id composto útil no FE
        childId: r.childId,
        childName: r.child?.name ?? null,
        badgeId: r.badgeId,
        name: r.badge?.name ?? null,
        type: r.badge?.type ?? null,
        criteria: r.badge?.criteria ?? null,
        assignedAt: r.assignedAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
