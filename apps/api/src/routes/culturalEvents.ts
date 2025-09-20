import { Router } from "express";
import { prisma } from "../prisma";
import { requireRole, ROLES } from "../middlewares/auth";

export const culturalEventsRouter = Router();

/**
 * GET /cultural-events?q=&from=&to=&libraryId=&limit=&cursor=
 * Lista paginada (cursor por id asc). Devolve `reserved` (se família autenticada reservou)
 * e `libraryName`.
 */
culturalEventsRouter.get("/cultural-events", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? 24), 10) || 24, 1), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;
    const libraryId = req.query.libraryId ? Number(req.query.libraryId) : null;

    const fromISO = req.query.from ? new Date(String(req.query.from)) : null;
    const toISO = req.query.to ? new Date(String(req.query.to)) : null;

    // por defeito: só eventos a partir de AGORA
    const now = new Date();
    const effectiveFrom = fromISO && !isNaN(fromISO.getTime()) ? fromISO : now;

    // filtro de intervalo: inclui eventos que COMECEM dentro do intervalo
    // ou que tenham endDate a sobrepor-se ao intervalo
    const rangeFilter =
      toISO && !isNaN(toISO.getTime())
        ? {
            OR: [
              { startDate: { gte: effectiveFrom, lte: toISO } },
              { AND: [{ startDate: { lte: toISO } }, { endDate: { gte: effectiveFrom } }] },
            ],
          }
        : {
            OR: [
              { startDate: { gte: effectiveFrom } },
              { endDate: { gte: effectiveFrom } },
            ],
          };

    const where: any = {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { library: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(libraryId ? { libraryId } : {}),
      ...rangeFilter,
      ...(cursor ? { id: { gt: cursor } } : {}),
    };

    const rows = await prisma.culturalEvent.findMany({
      where,
      orderBy: { id: "asc" },
      take: limit + 1,
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        category: true,
        capacity: true,
        imageUrl: true,
        libraryId: true,
        library: { select: { name: true } },
      },
    });

    const me = (req as any).user as { id: number; roles: string[] } | undefined;
    const myId = me?.id;

    // calcula reserved para o utilizador com role de família
    let reservedIds = new Set<number>();
    if (myId) {
      const roleNames = (me.roles || []).map((r) => r.toUpperCase());
      const isFamily =
        roleNames.includes(ROLES.FAMILY) ||
        roleNames.includes("FAMÍLIA") ||
        roleNames.includes("FAMILIA");
      if (isFamily && rows.length) {
        const ids = rows.map((r) => r.id);
        const resvs = await prisma.eventReservation.findMany({
          where: { familyId: myId, eventId: { in: ids } },
          select: { eventId: true },
        });
        reservedIds = new Set(resvs.map((r) => r.eventId));
      }
    }

    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const items = slice.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      startDate: r.startDate,
      endDate: r.endDate,
      location: r.location,
      category: r.category,
      capacity: r.capacity,
      imageUrl: r.imageUrl,
      libraryId: r.libraryId,
      libraryName: r.library?.name ?? null,
      reserved: reservedIds.has(r.id),
    }));

    return res.json({
      items,
      nextCursor: hasMore ? rows[limit].id : null,
    });
  } catch (e: any) {
    console.error("GET /cultural-events", e);
    return res.status(500).json({ error: "internal_error", message: e?.message });
  }
});

/**
 * POST /cultural-events/:id/reservations
 * Cria uma reserva para a família autenticada.
 */
culturalEventsRouter.post(
  "/cultural-events/:id/reservations",
  requireRole(ROLES.FAMILY, "FAMÍLIA"),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id);
      if (!Number.isFinite(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "invalid_event_id" });
      }
      const me = (req as any).user as { id: number };
      const familyId = me.id;

      // já existe?
      const existing = await prisma.eventReservation.findFirst({
        where: { eventId, familyId },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ error: "already_reserved" });
      }

      // valida evento e capacidade
      const ev = await prisma.culturalEvent.findUnique({
        where: { id: eventId },
        select: { id: true, capacity: true },
      });
      if (!ev) return res.status(404).json({ error: "not_found" });

      if (typeof ev.capacity === "number") {
        const count = await prisma.eventReservation.count({ where: { eventId } });
        if (count >= ev.capacity) {
          return res.status(409).json({ error: "capacity_full" });
        }
      }

      const created = await prisma.eventReservation.create({
        data: { eventId, familyId, status: "CONFIRMADA" },
        select: { id: true, eventId: true, familyId: true, bookedAt: true, status: true },
      });

      return res.json(created);
    } catch (e: any) {
      console.error("POST /cultural-events/:id/reservations", e);
      return res.status(500).json({ error: "internal_error", message: e?.message });
    }
  }
);

/**
 * DELETE /cultural-events/:id/reservations
 * Cancela a reserva da família autenticada.
 */
culturalEventsRouter.delete(
  "/cultural-events/:id/reservations",
  requireRole(ROLES.FAMILY, "FAMÍLIA"),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id);
      if (!Number.isFinite(eventId) || eventId <= 0) {
        return res.status(400).json({ error: "invalid_event_id" });
      }
      const me = (req as any).user as { id: number };
      const familyId = me.id;

      const existing = await prisma.eventReservation.findFirst({
        where: { eventId, familyId },
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: "reservation_not_found" });

      await prisma.eventReservation.delete({ where: { id: existing.id } });
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("DELETE /cultural-events/:id/reservations", e);
      return res.status(500).json({ error: "internal_error", message: e?.message });
    }
  }
);

export default culturalEventsRouter;
