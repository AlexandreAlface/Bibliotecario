import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

router.get("/events", async (_, res) => {
  const events = await prisma.culturalEvent.findMany({
    orderBy: { startDate: "asc" },
  });
  res.json(events);
});

/**
 * GET /api/events?type=evento&limit=3
 * type=evento (CulturalEvent) — default
 * (Se um dia quiseres expor "consultas" via /events?type=consulta, podes delegar para Consultation aqui)
 */
router.get("/", async (req, res, next) => {
  try {
    const type = String(req.query.type || "evento");
    const limit = Number(req.query.limit ?? 10);

    if (type !== "evento") return res.json([]); // apenas culturais por agora

    const events = await prisma.culturalEvent.findMany({
      orderBy: { startDate: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        location: true,
      },
    });

    res.json(
      events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.startDate.toLocaleDateString("pt-PT"),
        time: e.startDate.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        location: e.location ?? undefined,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
