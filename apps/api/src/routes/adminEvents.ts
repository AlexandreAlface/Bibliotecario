// apps/api/src/routes/adminEvents.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireRole, ROLES } from "../middlewares/auth.js";

const r = Router();

/* Helpers */
function parseLibraryId(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0)
    throw Object.assign(new Error("libraryId inválido"), { status: 400 });
  return n;
}
function assertNonEmpty(s: string | undefined, field = "campo") {
  if (!s || !s.trim())
    throw Object.assign(new Error(`"${field}" é obrigatório`), { status: 400 });
}
function toDateStrict(iso: string | undefined, field = "data") {
  if (!iso)
    throw Object.assign(new Error(`"${field}" é obrigatório`), { status: 400 });
  const d = new Date(iso);
  if (isNaN(d.getTime()))
    throw Object.assign(new Error(`"${field}" inválida`), { status: 400 });
  return d;
}
function manualGuid(libraryId: number, title: string, start: Date) {
  return `manual:${libraryId}:${title.trim().toLowerCase()}:${start.getTime()}`;
}

// apps/api/src/routes/adminEvents.ts
// ...imports iguais...
r.get(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      if (!Number.isFinite(libraryId) || libraryId <= 0) {
        return res.status(400).json({ error: "libraryId inválido" });
      }

      const events = await prisma.culturalEvent.findMany({
        where: {
          OR: [
            { libraryId }, // manuais
            { feed: { libraryId } }, // vindos de feed desta biblioteca
          ],
        },
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

      res.json(
        events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description ?? null,
          category: e.category ?? null,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate ? e.endDate.toISOString() : null,
          location: e.location ?? null,
          source: e.feedId ? "FEED" : "MANUAL",
        }))
      );
    } catch (e) {
      next(e);
    }
  }
);

r.post(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = Number(req.params.libraryId);
      if (!Number.isFinite(libraryId) || libraryId <= 0) {
        return res.status(400).json({ error: "libraryId inválido" });
      }
      const { id, title, startDate, endDate, location, description, category } =
        (req.body ?? {}) as {
          id?: number;
          title?: string;
          startDate?: string;
          endDate?: string;
          location?: string;
          description?: string;
          category?: string;
        };

      // valida
      if (!title || !title.trim())
        throw Object.assign(new Error(`"título" é obrigatório`), {
          status: 400,
        });
      const start = new Date(startDate!);
      if (isNaN(start.getTime()))
        throw Object.assign(new Error(`"início" inválida`), { status: 400 });
      const end = endDate ? new Date(endDate) : undefined;
      if (end && isNaN(end.getTime()))
        throw Object.assign(new Error(`"fim" inválida`), { status: 400 });

      // Categoria por defeito = nome da biblioteca
      const lib = await prisma.library.findUnique({
        where: { id: libraryId },
        select: { name: true },
      });
      const finalCategory =
        (category && category.trim()) || lib?.name || "MANUAL";

      if (id && Number.isFinite(Number(id))) {
        const updated = await prisma.culturalEvent.update({
          where: { id: Number(id) },
          data: {
            title: title.trim(),
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
          },
        });
        return res.json({
          ...updated,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate ? updated.endDate.toISOString() : null,
          source: "MANUAL",
        });
      }

      // Create (guid evita duplicados)
      const guid = `manual:${libraryId}:${title
        .trim()
        .toLowerCase()}:${start.getTime()}`;
      const created = await prisma.culturalEvent.upsert({
        where: { guid },
        create: {
          guid,
          title: title.trim(),
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
          title: title.trim(),
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
        },
      });

      res.status(201).json({
        ...created,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate ? created.endDate.toISOString() : null,
        source: "MANUAL",
      });
    } catch (e) {
      next(e);
    }
  }
);

/** CRIAR/ATUALIZAR — apenas MANUAL */
r.post(
  "/admin/libraries/:libraryId/events",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const { id, title, startDate, endDate, location } = (req.body ?? {}) as {
        id?: number;
        title?: string;
        startDate?: string;
        endDate?: string;
        location?: string;
      };

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
          },
        });
        return res.json({
          ...updated,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate ? updated.endDate.toISOString() : null,
          source: "MANUAL",
        });
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
        },
      });

      res.status(201).json({
        ...created,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate ? created.endDate.toISOString() : null,
        source: "MANUAL",
      });
    } catch (e) {
      next(e);
    }
  }
);

/** APAGAR — só MANUAL da própria biblioteca */
r.delete(
  "/admin/libraries/:libraryId/events/:id",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "id inválido" });

      const ev = await prisma.culturalEvent.findUnique({ where: { id } });
      if (!ev || ev.feedId !== null || ev.libraryId !== libraryId) {
        return res.status(403).json({ error: "evento_não_permitido" });
      }

      await prisma.culturalEvent.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  }
);

export default r;
