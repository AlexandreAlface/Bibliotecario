/**
 * Admin — eventos e inscrições.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Rotas originais mantidas. Extraí helpers puros para validar/parsing e
 *       formatação de respostas. Cada handler ≤ 30 linhas.
 */

import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma"; // mantém .js como no original
import { requireRole, ROLES } from "../../middlewares/auth.js";

const r = Router();

/* ========================= Helpers puros =========================
 * — Alexandre Brissos — 2025-10-02
 */

/** Converte para ID positivo, lança 400 se inválido. — Alexandre Brissos — 2025-10-02 */
function parseLibraryId(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0)
    throw Object.assign(new Error("libraryId inválido"), { status: 400 });
  return n;
}

/** Garante texto não vazio. — Alexandre Brissos — 2025-10-02 */
function assertNonEmpty(s: string | undefined, field = "campo") {
  if (!s || !s.trim())
    throw Object.assign(new Error(`"${field}" é obrigatório`), { status: 400 });
}

/** Converte ISO → Date válida. — Alexandre Brissos — 2025-10-02 */
function toDateStrict(iso: string | undefined, field = "data") {
  if (!iso)
    throw Object.assign(new Error(`"${field}" é obrigatório`), { status: 400 });
  const d = new Date(iso);
  if (isNaN(d.getTime()))
    throw Object.assign(new Error(`"${field}" inválida`), { status: 400 });
  return d;
}

/** GUID estável para eventos manuais. — Alexandre Brissos — 2025-10-02 */
function manualGuid(libraryId: number, title: string, start: Date) {
  return `manual:${libraryId}:${title.trim().toLowerCase()}:${start.getTime()}`;
}

/** Mapeia CulturalEvent → DTO para API. — Alexandre Brissos — 2025-10-02 */
function eventToDto(e: {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  feedId: number | null;
}) {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? null,
    category: e.category ?? null,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate ? e.endDate.toISOString() : null,
    location: e.location ?? null,
    source: e.feedId ? "FEED" : "MANUAL",
  };
}

/** Mapeia reservation → DTO. — Alexandre Brissos — 2025-10-02 */
function reservationToDto(r: {
  id: number;
  status: string;
  bookedAt: Date;
  familyId: number;
  family: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}) {
  return {
    id: r.id,
    status: r.status,
    bookedAt: r.bookedAt.toISOString(),
    familyId: r.familyId,
    familyName: r.family?.fullName ?? "",
    familyEmail: r.family?.email ?? "",
    familyPhone: r.family?.phone ?? "",
  };
}

/** Normaliza paginação (page>=1, 1<=limit<=200). — Alexandre Brissos — 2025-10-02 */
function parsePageLimit(q: any) {
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(200, Math.max(1, Number(q.limit || 50)));
  return { page, limit };
}

/* ========================= Rotas (inalteradas) =========================
 * — Alexandre Brissos — 2025-10-02
 */

/**
 * GET /admin/libraries/:libraryId/events — lista eventos (manuais + feed da lib).
 * — Alexandre Brissos — 2025-10-02
 */
r.get(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const events = await prisma.culturalEvent.findMany({
        where: { OR: [{ libraryId }, { feed: { libraryId } }] },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          startDate: true,
          endDate: true,
          location: true,
          feedId: true,
        },
      });
      return res.json(events.map(eventToDto));
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * POST /admin/libraries/:libraryId/events — criar/atualizar (com categoria da biblioteca por defeito).
 * Mantida a rota original n.º 1. — Alexandre Brissos — 2025-10-02
 */
r.post(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const { id, title, startDate, endDate, location, description, category } =
        (req.body ?? {}) as any;
      assertNonEmpty(title, "título");
      const start = toDateStrict(startDate, "início");
      const end = endDate ? toDateStrict(endDate, "fim") : undefined;
      const lib = await prisma.library.findUnique({
        where: { id: libraryId },
        select: { name: true },
      });
      const finalCategory =
        (category && String(category).trim()) || lib?.name || "MANUAL";

      if (id && Number.isFinite(Number(id))) {
        const updated = await prisma.culturalEvent.update({
          where: { id: Number(id) },
          data: {
            title: title!.trim(),
            startDate: start,
            endDate: end,
            location: location?.trim() || null,
            description: description?.trim() || null,
            category: finalCategory,
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            startDate: true,
            endDate: true,
            location: true,
            feedId: true,
          },
        });
        return res.json(eventToDto(updated));
      }

      const guid = manualGuid(libraryId, title!, start);
      const created = await prisma.culturalEvent.upsert({
        where: { guid },
        create: {
          guid,
          title: title!.trim(),
          pubDate: new Date(),
          startDate: start,
          endDate: end,
          location: location?.trim() || null,
          description: description?.trim() || null,
          category: finalCategory,
          libraryId,
          feedId: null,
        },
        update: {
          title: title!.trim(),
          startDate: start,
          endDate: end,
          location: location?.trim() || null,
          description: description?.trim() || null,
          category: finalCategory,
          libraryId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          startDate: true,
          endDate: true,
          location: true,
          feedId: true,
        },
      });
      return res.status(201).json(eventToDto(created));
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * POST /admin/libraries/:libraryId/events — criar/atualizar (versão 2 do original).
 * Mantida por compatibilidade. — Alexandre Brissos — 2025-10-02
 */
r.post(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const { id, title, startDate, endDate, location } = (req.body ??
        {}) as any;
      assertNonEmpty(title, "título");
      const start = toDateStrict(startDate, "início");
      const end = endDate ? toDateStrict(endDate, "fim") : undefined;

      if (id && Number.isFinite(Number(id))) {
        const updated = await prisma.culturalEvent.update({
          where: { id: Number(id) },
          data: {
            title: title!.trim(),
            startDate: start,
            endDate: end,
            location: location?.trim() || null,
          },
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            feedId: true,
            description: true,
            category: true,
          },
        });
        return res.json(eventToDto(updated));
      }

      const guid = manualGuid(libraryId, title!, start);
      const created = await prisma.culturalEvent.upsert({
        where: { guid },
        create: {
          guid,
          title: title!.trim(),
          pubDate: new Date(),
          startDate: start,
          endDate: end,
          location: location?.trim() || null,
          category: "MANUAL",
          libraryId,
          feedId: null,
        },
        update: {
          title: title!.trim(),
          startDate: start,
          endDate: end,
          location: location?.trim() || null,
          category: "MANUAL",
          libraryId,
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          feedId: true,
          description: true,
          category: true,
        },
      });
      return res.status(201).json(eventToDto(created));
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * DELETE /admin/libraries/:libraryId/events/:id — apaga apenas eventos MANUAL da própria biblioteca.
 * — Alexandre Brissos — 2025-10-02
 */
r.delete(
  "/admin/libraries/:libraryId/events/:id",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "id inválido" });
      const ev = await prisma.culturalEvent.findUnique({ where: { id } });
      if (!ev || ev.feedId !== null || ev.libraryId !== libraryId)
        return res.status(403).json({ error: "evento_não_permitido" });
      await prisma.culturalEvent.delete({ where: { id } });
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
);

/* ========================= Helpers com efeitos =========================
 * — Alexandre Brissos — 2025-10-02
 */

/** Verifica capacidade antes de confirmar. — Alexandre Brissos — 2025-10-02 */
async function ensureCanConfirm(eventId: number) {
  const ev = await prisma.culturalEvent.findUnique({
    where: { id: eventId },
    select: {
      capacity: true,
      reservations: { where: { status: "CONFIRMED" }, select: { id: true } },
    },
  });
  if (!ev)
    throw Object.assign(new Error("evento_inexistente"), { status: 404 });
  if (ev.capacity && ev.reservations.length >= ev.capacity)
    throw Object.assign(new Error("capacity_full"), { status: 409 });
}

/**
 * GET /admin/events/:eventId/reservations — lista inscritos, com paginação e busca.
 * — Alexandre Brissos — 2025-10-02
 */
r.get(
  "/admin/events/:eventId/reservations",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const status = String(req.query.status || "").toUpperCase(); // PENDING|CONFIRMED
      const q = String(req.query.q || "").trim();
      const { page, limit } = parsePageLimit(req.query);
      const where: any = { eventId };
      if (status === "PENDING" || status === "CONFIRMED") where.status = status;
      if (q)
        where.OR = [
          { family: { fullName: { contains: q, mode: "insensitive" } } },
          { family: { email: { contains: q, mode: "insensitive" } } },
          { family: { phone: { contains: q, mode: "insensitive" } } },
        ];
      const [total, rows] = await Promise.all([
        prisma.eventReservation.count({ where }),
        prisma.eventReservation.findMany({
          where,
          orderBy: [{ status: "asc" }, { bookedAt: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            bookedAt: true,
            status: true,
            familyId: true,
            family: { select: { fullName: true, email: true, phone: true } },
          },
        }),
      ]);
      return res.json({
        total,
        page,
        limit,
        items: rows.map(reservationToDto),
      });
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * POST /admin/events/:eventId/reservations — cria inscrição manual.
 * — Alexandre Brissos — 2025-10-02
 */
r.post(
  "/admin/events/:eventId/reservations",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const { familyId, status } = req.body as {
        familyId?: number;
        status?: "PENDING" | "CONFIRMED";
      };
      if (!Number.isFinite(familyId))
        return res.status(400).json({ error: "familyId inválido" });
      if (status === "CONFIRMED") await ensureCanConfirm(eventId);
      const created = await prisma.eventReservation.create({
        data: {
          eventId,
          familyId: Number(familyId),
          status: status || "PENDING",
        },
        select: { id: true },
      });
      return res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2002")
        return res.status(409).json({ error: "already_registered" });
      return next(e);
    }
  }
);

/**
 * PATCH /admin/events/:eventId/reservations/:id — altera estado (confirmar/pendente).
 * — Alexandre Brissos — 2025-10-02
 */
r.patch(
  "/admin/events/:eventId/reservations/:id",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const id = Number(req.params.id);
      const { status } = req.body as { status?: "PENDING" | "CONFIRMED" };
      if (!status) return res.status(400).json({ error: "status_necessário" });
      if (status === "CONFIRMED") await ensureCanConfirm(eventId);
      const updated = await prisma.eventReservation.update({
        where: { id },
        data: { status },
        select: { id: true, status: true },
      });
      return res.json(updated);
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * DELETE /admin/events/:eventId/reservations/:id — apaga inscrição.
 * — Alexandre Brissos — 2025-10-02
 */
r.delete(
  "/admin/events/:eventId/reservations/:id",
  requireRole(ROLES.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(_req.params.id);
      await prisma.eventReservation.delete({ where: { id } });
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * GET /admin/events/:eventId/reservations/summary — contadores rápidos.
 * — Alexandre Brissos — 2025-10-02
 */
r.get(
  "/admin/events/:eventId/reservations/summary",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const [ev, conf, pend] = await Promise.all([
        prisma.culturalEvent.findUnique({
          where: { id: eventId },
          select: { capacity: true },
        }),
        prisma.eventReservation.count({
          where: { eventId, status: "CONFIRMED" },
        }),
        prisma.eventReservation.count({
          where: { eventId, status: "PENDING" },
        }),
      ]);
      return res.json({
        capacity: ev?.capacity ?? null,
        confirmed: conf,
        pending: pend,
        total: conf + pend,
      });
    } catch (e) {
      return next(e);
    }
  }
);

/**
 * GET /admin/events/:eventId/reservations/export.csv — export simples.
 * — Alexandre Brissos — 2025-10-02
 */
r.get(
  "/admin/events/:eventId/reservations/export.csv",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const rows = await prisma.eventReservation.findMany({
        where: { eventId },
        orderBy: [{ status: "asc" }, { bookedAt: "asc" }],
        select: {
          bookedAt: true,
          status: true,
          family: { select: { fullName: true, email: true, phone: true } },
        },
      });
      const header = "Nome,Email,Telefone,Estado,Inscrito em\n";
      const body = rows
        .map(
          (r) =>
            `"${(r.family?.fullName ?? "").replace(/\"/g, '""')}",${
              r.family?.email ?? ""
            },${r.family?.phone ?? ""},${r.status},${r.bookedAt.toISOString()}`
        )
        .join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inscritos.csv"
      );
      return res.send(header + body);
    } catch (e) {
      return next(e);
    }
  }
);

export default r;
