// apps/api/src/routes/readings.js
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

/**
 * GET /api/readings
 * Query:
 *  - limit?: number
 *  - childId?: number
 *  - familyId?: number   // todas as leituras dos filhos dessa família
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const childId = req.query.childId ? Number(req.query.childId) : undefined;
    const familyId = req.query.familyId
      ? Number(req.query.familyId)
      : undefined;

    /** Filtro dinâmico */
    const where = {};
    if (childId) where.childId = childId;

    if (familyId) {
      // Reading -> child (1:1), e Child -> families (1:N via ChildFamily)
      where.child = {
        is: {
          families: {
            some: { familyId }, // 👈 isto é o essencial
          },
        },
      };
    }

    const rows = await prisma.reading.findMany({
      where,
      orderBy: { readAt: "desc" },
      take: limit,
      include: {
        book: { select: { isbn: true, title: true, coverUrl: true } },
        child: { select: { id: true, name: true } }, // ⬅️ nada de familyId aqui
      },
    });

    res.json(
      rows.map((r) => ({
        id: r.id,
        childId: r.childId,
        childName: r.child?.name ?? null,
        isbn: r.book?.isbn ?? r.bookIsbn,
        title: r.book?.title ?? null,
        coverUrl: r.book?.coverUrl ?? null,
        date: r.readAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
