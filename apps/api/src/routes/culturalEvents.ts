// apps/api/src/routes/cultural-events.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista eventos culturais (com paginação/cursor) e cria/cancela reservas.
// Usa helpers “puros” e cada handler tem <30 linhas.

import { Router, type Request, type RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireRole, ROLES } from "../middlewares/auth";

export const culturalEventsRouter = Router();

/* --------------- Helpers PUROS --------------- */
const toInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};
const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const buildRangeFilter = (from?: Date | null, to?: Date | null) => {
  const now = new Date();
  const f = from && !Number.isNaN(from.getTime()) ? from : now;
  if (to && !Number.isNaN(to.getTime())) {
    return {
      OR: [
        { startDate: { gte: f, lte: to } },
        { AND: [{ startDate: { lte: to } }, { endDate: { gte: f } }] },
      ],
    } satisfies Prisma.CulturalEventWhereInput;
  }
  return {
    OR: [{ startDate: { gte: f } }, { endDate: { gte: f } }],
  } satisfies Prisma.CulturalEventWhereInput;
};

const buildWhere = ({
  q,
  libraryId,
  range,
  cursor,
}: {
  q?: string;
  libraryId?: number | null;
  range: Prisma.CulturalEventWhereInput;
  cursor?: number | null;
}): Prisma.CulturalEventWhereInput => ({
  ...(q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { library: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {}),
  ...(libraryId ? { libraryId } : {}),
  ...range,
  ...(cursor ? { id: { gt: cursor } } : {}),
});

const mapEvent = (
  r: {
    id: number;
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    location: string | null;
    category: string | null;
    capacity: number | null;
    imageUrl: string | null;
    libraryId: number | null;
    library: { name: string } | null;
  },
  reservedIds: Set<number>
) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  startDate: r.startDate.toISOString(),
  endDate: r.endDate ? r.endDate.toISOString() : null,
  location: r.location,
  category: r.category,
  capacity: r.capacity,
  imageUrl: r.imageUrl,
  libraryId: r.libraryId,
  libraryName: r.library?.name ?? null,
  reserved: reservedIds.has(r.id),
});

const isFamilyUser = (req: Request) => {
  const me = (req as any).user as { id: number; roles?: string[] } | undefined;
  const roles = (me?.roles || []).map((r) => r.toUpperCase());
  return {
    userId: me?.id,
    isFamily:
      roles.includes(ROLES.FAMILY) ||
      roles.includes("FAMÍLIA") ||
      roles.includes("FAMILIA"),
  };
};

const getReservedIds = async (familyId: number, eventIds: number[]) => {
  if (!eventIds.length) return new Set<number>();
  const rows = await prisma.eventReservation.findMany({
    where: { familyId, eventId: { in: eventIds } },
    select: { eventId: true },
  });
  return new Set(rows.map((r) => r.eventId));
};

const ensureCapacityOrThrow = async (eventId: number) => {
  const ev = await prisma.culturalEvent.findUnique({
    where: { id: eventId },
    select: { id: true, capacity: true },
  });
  if (!ev) return { notFound: true as const };
  if (typeof ev.capacity === "number") {
    const count = await prisma.eventReservation.count({ where: { eventId } });
    if (count >= ev.capacity) return { full: true as const };
  }
  return { ok: true as const };
};

/* --------------- Handlers (<30 linhas) --------------- */

// GET /cultural-events
culturalEventsRouter.get("/cultural-events", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim() || undefined;
    const limit = clamp(
      parseInt(String(req.query.limit ?? 24), 10) || 24,
      1,
      100
    );
    const cursor = toInt(req.query.cursor);
    const libraryId = toInt(req.query.libraryId);
    const range = buildRangeFilter(
      toDate(req.query.from),
      toDate(req.query.to)
    );
    const where = buildWhere({ q, libraryId, range, cursor });

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

    const { userId, isFamily } = isFamilyUser(req);
    const reservedIds =
      userId && isFamily
        ? await getReservedIds(
            userId,
            rows.map((r) => r.id)
          )
        : new Set<number>();

    const slice = rows.slice(0, limit);
    return res.json({
      items: slice.map((r) => mapEvent(r, reservedIds)),
      nextCursor: rows.length > limit ? rows[limit].id : null,
    });
  } catch (e: any) {
    console.error("GET /cultural-events", e);
    return res
      .status(500)
      .json({ error: "internal_error", message: e?.message });
  }
});

// POST /cultural-events/:id/reservations
culturalEventsRouter.post(
  "/cultural-events/:id/reservations",
  requireRole(ROLES.FAMILY, "FAMÍLIA"),
  async (req, res) => {
    try {
      const eventId = toInt(req.params.id);
      if (!eventId || eventId <= 0)
        return res.status(400).json({ error: "invalid_event_id" });
      const familyId = (req as any).user.id as number;

      const exists = await prisma.eventReservation.findFirst({
        where: { eventId, familyId },
        select: { id: true },
      });
      if (exists) return res.status(409).json({ error: "already_reserved" });

      const cap = await ensureCapacityOrThrow(eventId);
      if ("notFound" in cap)
        return res.status(404).json({ error: "not_found" });
      if ("full" in cap)
        return res.status(409).json({ error: "capacity_full" });

      const created = await prisma.eventReservation.create({
        data: { eventId, familyId, status: "CONFIRMADA" },
        select: {
          id: true,
          eventId: true,
          familyId: true,
          bookedAt: true,
          status: true,
        },
      });
      return res.json(created);
    } catch (e: any) {
      console.error("POST /cultural-events/:id/reservations", e);
      return res
        .status(500)
        .json({ error: "internal_error", message: e?.message });
    }
  }
);

// DELETE /cultural-events/:id/reservations
culturalEventsRouter.delete(
  "/cultural-events/:id/reservations",
  requireRole(ROLES.FAMILY, "FAMÍLIA"),
  async (req, res) => {
    try {
      const eventId = toInt(req.params.id);
      if (!eventId || eventId <= 0)
        return res.status(400).json({ error: "invalid_event_id" });
      const familyId = (req as any).user.id as number;

      const existing = await prisma.eventReservation.findFirst({
        where: { eventId, familyId },
        select: { id: true },
      });
      if (!existing)
        return res.status(404).json({ error: "reservation_not_found" });

      await prisma.eventReservation.delete({ where: { id: existing.id } });
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("DELETE /cultural-events/:id/reservations", e);
      return res
        .status(500)
        .json({ error: "internal_error", message: e?.message });
    }
  }
);

export default culturalEventsRouter;
