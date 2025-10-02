// apps/api/src/routes/events.ts
// Autor: Alexandre Brissos 21131
// O que faz: expõe eventos culturais.
// - GET /events  → lista completa (legacy)
// - GET /        → cartões resumidos (type=evento, limit)
// Usa helpers “puros” e cada handler tem <30 linhas.

import { Router, type NextFunction, type Request, type Response } from "express";
import { prisma } from "../prisma";

const router = Router();

/* ----------------- Helpers PUROS ----------------- */
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const toLimit = (v: unknown, def = 10, min = 1, max = 50) =>
  clamp(Number(v ?? def) || def, min, max);
const toType = (v: unknown) => String(v ?? "evento").trim().toLowerCase();

type EventRow = {
  id: number;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  category: string | null;
  imageUrl: string | null;
};

const fmtDate = (d?: Date | null) => (d ? d.toLocaleDateString("pt-PT") : undefined);
const fmtTime = (d?: Date | null) =>
  d ? d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : undefined;

const mapEvent = (e: EventRow) => ({
  id: e.id,
  title: e.title,
  date: fmtDate(e.startDate),
  time: fmtTime(e.startDate),
  location: e.location ?? undefined,
  category: e.category ?? undefined,
  imageUrl: e.imageUrl ?? null,
});

/* ----------------- Rotas (<30 linhas) ----------------- */

// (opcional) endpoint "completo" – mantém como legacy
router.get("/events", async (_: Request, res: Response) => {
  const events = await prisma.culturalEvent.findMany({ orderBy: { startDate: "asc" } });
  res.json(events);
});

// GET /api/events?type=evento&limit=3
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = toType(req.query.type);
    const limit = toLimit(req.query.limit, 10);
    if (type !== "evento") return res.json([]);

    const rows = await prisma.culturalEvent.findMany({
      orderBy: { startDate: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        location: true,
        category: true,
        imageUrl: true,
      },
    });

    res.json(rows.map(mapEvent));
  } catch (err) {
    next(err);
  }
});

export default router;
