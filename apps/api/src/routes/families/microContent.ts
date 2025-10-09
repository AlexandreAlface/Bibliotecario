// apps/api/src/routes/microContent.ts
// Autor: Alexandre Brissos 21131
// O que faz: CRUD de micro-conteúdos (admin) e listagem pública com interações.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import z from "zod";
import { prisma } from "../../prisma";
import { MicroContentType } from "@prisma/client";

type AnyReq = Request & { user?: { id?: number } | null; authUserId?: number };

const r = Router();

/* -------------------- Schemas -------------------- */
const UpsertSchema = z.object({
  text: z.string().min(1),
  type: z.nativeEnum(MicroContentType).default(MicroContentType.BIBLIOTERAPIA),
  tags: z.array(z.string().min(1)).default([]),
  libraryId: z.number().int().optional().nullable(),
  bookIsbns: z.array(z.string().min(1)).default([]),
  isPublished: z.boolean().default(true),
  publishedAt: z.string().datetime().or(z.date()).optional().nullable(),
});

const QueryListSchema = z.object({
  q: z.string().optional(),
  type: z.nativeEnum(MicroContentType).optional(),
  tag: z.string().optional(),
  libraryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/* -------------------- Helpers PUROS -------------------- */
const getUserId = (req: AnyReq) =>
  Number(req.user?.id) > 0 ? Number(req.user?.id) : null;

const ensureUser: RequestHandler = (req, res, next) => {
  const id = getUserId(req as AnyReq);
  if (!id) return void res.status(401).json({ error: "unauthenticated" });
  (req as AnyReq).authUserId = id;
  next();
};

const normalizeTags = (raw: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\n;]+/g))
        .map((s) => String(s).trim())
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " ").slice(0, 64))
    )
  );

const normalizeIsbns = (raw: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\s;]+/g))
        .map((s) => String(s).replace(/[-\s]/g, "").toUpperCase())
        .filter(Boolean)
        .filter((s) => /^\d{13}$|^\d{9}(\d|X)$/.test(s))
    )
  );

const buildWhere = (
  q: z.infer<typeof QueryListSchema>,
  publishedOnly: boolean
) => {
  const where: any = publishedOnly ? { isPublished: true } : {};
  if (q.libraryId != null) where.libraryId = q.libraryId;
  if (q.type) where.type = q.type;
  if (q.tag) where.tags = { has: q.tag };
  if (q.q && q.q.trim())
    where.OR = [
      { text: { contains: q.q, mode: "insensitive" } },
      { tags: { has: q.q } },
    ];
  return where;
};

const mapAdminItem = (mc: any) => ({
  id: mc.id,
  text: mc.text,
  type: mc.type,
  tags: mc.tags,
  library: mc.library ? { id: mc.library.id, name: mc.library.name } : null,
  isPublished: mc.isPublished,
  publishedAt: mc.publishedAt,
  books: mc.books.map((b: any) => ({
    isbn: b.bookIsbn,
    title: b.book?.title ?? "",
    coverUrl: b.book?.coverUrl ?? null,
  })),
  author: mc.author ? { id: mc.author.id, name: mc.author.fullName } : null,
  createdAt: mc.createdAt,
  updatedAt: mc.updatedAt,
});

const mapPublicItem = (mc: any, userId?: number) => ({
  id: mc.id,
  text: mc.text,
  type: mc.type,
  tags: mc.tags,
  library: mc.library ? { id: mc.library.id, name: mc.library.name } : null,
  publishedAt: mc.publishedAt,
  books: mc.books.map((b: any) => ({
    isbn: b.bookIsbn,
    title: b.book?.title ?? "",
    coverUrl: b.book?.coverUrl ?? null,
    summary: b.book?.summary ?? null,
  })),
  interactionsCount: mc._count?.interactions ?? 0,
  seen: Boolean(
    userId && Array.isArray(mc.interactions) && mc.interactions.length > 0
  ),
});

/* -------------------- Services (puros/curtos) -------------------- */
const listMicroAdmin = async (where: any, page: number, limit: number) => {
  const [total, items] = await Promise.all([
    prisma.microContent.count({ where }),
    prisma.microContent.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        books: {
          include: {
            book: { select: { isbn: true, title: true, coverUrl: true } },
          },
        },
        library: { select: { id: true, name: true } },
        author: { select: { id: true, fullName: true } },
      },
    }),
  ]);
  return { total, items: items.map(mapAdminItem) };
};

const createMicro = async (
  payload: z.infer<typeof UpsertSchema>,
  authorId?: number
) => {
  const { text, type, isPublished } = payload;
  const tags = normalizeTags(payload.tags);
  const bookIsbns = normalizeIsbns(payload.bookIsbns);
  const publishedAt = payload.publishedAt
    ? new Date(payload.publishedAt as any)
    : undefined;
  const libraryId = payload.libraryId ?? undefined;

  const mc = await prisma.$transaction(async (tx) => {
    const created = await tx.microContent.create({
      data: { text, type, tags, isPublished, publishedAt, libraryId, authorId },
    });
    if (bookIsbns.length) {
      const existing = await tx.book.findMany({
        where: { isbn: { in: bookIsbns } },
        select: { isbn: true },
      });
      if (existing.length) {
        await tx.microContentBook.createMany({
          data: existing.map((b) => ({
            microContentId: created.id,
            bookIsbn: b.isbn,
          })),
          skipDuplicates: true,
        });
      }
    }
    return created;
  });
  return { id: mc.id };
};

const updateMicro = async (
  id: number,
  payload: z.infer<typeof UpsertSchema>
) => {
  const { text, type, isPublished } = payload;
  const tags = normalizeTags(payload.tags);
  const bookIsbns = normalizeIsbns(payload.bookIsbns);
  const publishedAt = payload.publishedAt
    ? new Date(payload.publishedAt as any)
    : undefined;
  const libraryId = payload.libraryId ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.microContent.update({
      where: { id },
      data: { text, type, tags, isPublished, publishedAt, libraryId },
    });
    await tx.microContentBook.deleteMany({ where: { microContentId: id } });
    if (bookIsbns.length) {
      const existing = await tx.book.findMany({
        where: { isbn: { in: bookIsbns } },
        select: { isbn: true },
      });
      if (existing.length) {
        await tx.microContentBook.createMany({
          data: existing.map((b) => ({ microContentId: id, bookIsbn: b.isbn })),
          skipDuplicates: true,
        });
      }
    }
  });
};

const listMicroPublic = async (
  where: any,
  page: number,
  limit: number,
  userId?: number
) => {
  const include: any = {
    books: {
      include: {
        book: {
          select: { isbn: true, title: true, coverUrl: true, summary: true },
        },
      },
    },
    library: { select: { id: true, name: true } },
    _count: { select: { interactions: true } },
  };
  if (userId)
    include.interactions = { where: { userId }, select: { id: true } };

  const [total, items] = await Promise.all([
    prisma.microContent.count({ where }),
    prisma.microContent.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include,
    }),
  ]);
  return { total, items: items.map((mc: any) => mapPublicItem(mc, userId)) };
};

/* -------------------- Admin: CRUD (handlers < 30 linhas) -------------------- */

// GET /admin/micro-contents
r.get(
  "/admin/micro-contents",
  ensureUser,
  async (req: Request, res: Response) => {
    const parsed = QueryListSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "bad_query" });
    const { page = 1, limit = 20 } = parsed.data;
    const where = buildWhere(parsed.data, false);
    const out = await listMicroAdmin(where, page, limit);
    res.json({ total: out.total, page, limit, items: out.items });
  }
);

// POST /admin/micro-contents
r.post(
  "/admin/micro-contents",
  ensureUser,
  async (req: Request, res: Response) => {
    const body = UpsertSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "bad_body" });
    try {
      const id = (await createMicro(body.data, (req as AnyReq).authUserId))?.id;
      res.json({ ok: true, id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "create_failed" });
    }
  }
);

// PUT /admin/micro-contents/:id
r.put(
  "/admin/micro-contents/:id",
  ensureUser,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_id" });
    const body = UpsertSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "bad_body" });
    try {
      await updateMicro(id, body.data);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "update_failed" });
    }
  }
);

// DELETE /admin/micro-contents/:id
r.delete(
  "/admin/micro-contents/:id",
  ensureUser,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_id" });
    await prisma.microContent.delete({ where: { id } });
    res.json({ ok: true });
  }
);

/* -------------------- Público -------------------- */

// GET /micro-contents
r.get("/micro-contents", async (req: Request, res: Response) => {
  const parsed = QueryListSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "bad_query" });
  const { page = 1, limit = 12 } = parsed.data;
  const where = buildWhere(parsed.data, true);
  const userId = getUserId(req as AnyReq) ?? undefined;
  const out = await listMicroPublic(where, page, limit, userId);
  res.json({ total: out.total, page, limit, items: out.items });
});

// POST /micro-interactions  { microContentId: number }
r.post(
  "/micro-interactions",
  ensureUser,
  async (req: Request, res: Response) => {
    const microContentId = Number((req.body || {}).microContentId);
    if (!Number.isFinite(microContentId))
      return res.status(400).json({ error: "bad_body" });
    await prisma.microInteraction.upsert({
      where: {
        userId_microContentId: {
          userId: (req as AnyReq).authUserId!,
          microContentId,
        },
      },
      update: {},
      create: { userId: (req as AnyReq).authUserId!, microContentId },
    });
    res.json({ ok: true });
  }
);

export default r;
