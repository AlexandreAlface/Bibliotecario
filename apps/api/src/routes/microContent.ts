// apps/api/src/routes/microContent.ts
import { Router, Request, Response } from "express";
import z from "zod";
import { prisma } from "../prisma.js";
import { MicroContentType } from "@prisma/client";

const r = Router();

function requireUser(req: Request, res: Response): asserts req is Request & { user: Express.User } {
  if (!req.user) {
    // podes também lançar erro; aqui devolvo 401 de forma explícita
    res.status(401).json({ error: "unauthenticated" });
    // Hack para TypeScript perceber que daqui para a frente a função não prossegue
    throw new Error("unauthenticated");
  }
}

/* -------------------- Schemas -------------------- */
const UpsertSchema = z.object({
  text: z.string().min(1),
  type: z.nativeEnum(MicroContentType).default(MicroContentType.BIBLIOTERAPIA),
  tags: z.array(z.string().min(1)).default([]),
  libraryId: z.number().int().optional().nullable(),
  bookIsbns: z.array(z.string().min(1)).default([]),
  isPublished: z.boolean().default(true),
  publishedAt: z
    .string()
    .datetime()
    .or(z.date())
    .optional()
    .nullable(),
});

const QueryListSchema = z.object({
  q: z.string().optional(),
  type: z.nativeEnum(MicroContentType).optional(),
  tag: z.string().optional(),
  libraryId: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .optional(),
});

/* -------------------- Admin: CRUD -------------------- */

// GET /admin/micro-contents
r.get("/admin/micro-contents", async (req, res) => {
  requireUser(req, res);
  const q = QueryListSchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "bad_query" });

  const { q: query, type, tag, libraryId, page = 1, limit = 20 } = q.data;

  const where: any = {};
  if (libraryId != null) where.libraryId = libraryId;
  if (type) where.type = type;
  if (tag) where.tags = { has: tag };
  if (query && query.trim()) {
    where.OR = [
      { text: { contains: query, mode: "insensitive" } },
      { tags: { has: query } },
    ];
  }

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

  res.json({
    total,
    page,
    limit,
    items: items.map((mc) => ({
      id: mc.id,
      text: mc.text,
      type: mc.type,
      tags: mc.tags,
      library: mc.library ? { id: mc.library.id, name: mc.library.name } : null,
      isPublished: mc.isPublished,
      publishedAt: mc.publishedAt,
      books: mc.books.map((b) => ({
        isbn: b.bookIsbn,
        title: b.book?.title ?? "",
        coverUrl: b.book?.coverUrl ?? null,
      })),
      author:
        mc.author != null ? { id: mc.author.id, name: mc.author.fullName } : null,
      createdAt: mc.createdAt,
      updatedAt: mc.updatedAt,
    })),
  });
});

// POST /admin/micro-contents
r.post("/admin/micro-contents", async (req, res) => {
  requireUser(req, res);
  const body = UpsertSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_body" });

  const {
    text,
    type,
    tags,
    libraryId,
    bookIsbns,
    isPublished,
    publishedAt,
  } = body.data;

  const created = await prisma.microContent.create({
    data: {
      text,
      type,
      tags,
      isPublished,
      publishedAt: publishedAt ? new Date(publishedAt as any) : undefined,
      libraryId: libraryId ?? undefined,
      authorId: (req.user as any)?.id ?? undefined,
      books: {
        createMany: {
          data: Array.from(new Set(bookIsbns)).map((isbn) => ({
            bookIsbn: isbn,
          })),
          skipDuplicates: true,
        },
      },
    },
    include: {
      books: { include: { book: { select: { isbn: true, title: true, coverUrl: true } } } },
    },
  });

  res.json({
    ok: true,
    id: created.id,
  });
});

// PUT /admin/micro-contents/:id
r.put("/admin/micro-contents/:id", async (req, res) => {
  requireUser(req, res);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_id" });

  const body = UpsertSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_body" });

  const { text, type, tags, libraryId, bookIsbns, isPublished, publishedAt } =
    body.data;

  // sync de livros
  await prisma.$transaction(async (tx) => {
    await tx.microContent.update({
      where: { id },
      data: {
        text,
        type,
        tags,
        isPublished,
        publishedAt: publishedAt ? new Date(publishedAt as any) : undefined,
        libraryId: libraryId ?? null,
      },
    });

    // substituir associações
    await tx.microContentBook.deleteMany({ where: { microContentId: id } });
    if (bookIsbns?.length) {
      await tx.microContentBook.createMany({
        data: Array.from(new Set(bookIsbns)).map((isbn) => ({
          microContentId: id,
          bookIsbn: isbn,
        })),
        skipDuplicates: true,
      });
    }
  });

  res.json({ ok: true });
});

// DELETE /admin/micro-contents/:id
r.delete("/admin/micro-contents/:id", async (req, res) => {
  requireUser(req, res);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_id" });

  await prisma.microContent.delete({ where: { id } });
  res.json({ ok: true });
});

/* -------------------- Público (família/filhos) -------------------- */

// GET /micro-contents
r.get("/micro-contents", async (req, res) => {
  const q = QueryListSchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "bad_query" });

  const { q: query, type, tag, libraryId, page = 1, limit = 12 } = q.data;
  const where: any = { isPublished: true };
  if (libraryId != null) where.libraryId = libraryId;
  if (type) where.type = type;
  if (tag) where.tags = { has: tag };
  if (query && query.trim()) {
    where.OR = [
      { text: { contains: query, mode: "insensitive" } },
      { tags: { has: query } },
    ];
  }

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
            book: { select: { isbn: true, title: true, coverUrl: true, summary: true } },
          },
        },
        library: { select: { id: true, name: true } },
      },
    }),
  ]);

  res.json({
    total,
    page,
    limit,
    items: items.map((mc) => ({
      id: mc.id,
      text: mc.text,
      type: mc.type,
      tags: mc.tags,
      library: mc.library ? { id: mc.library.id, name: mc.library.name } : null,
      publishedAt: mc.publishedAt,
      books: mc.books.map((b) => ({
        isbn: b.bookIsbn,
        title: b.book?.title ?? "",
        coverUrl: b.book?.coverUrl ?? null,
        summary: b.book?.summary ?? null,
      })),
    })),
  });
});

// POST /micro-interactions  { microContentId: number }
r.post("/micro-interactions", async (req, res) => {
  requireUser(req, res);
  const id = Number(req.body?.microContentId);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad_body" });

  await prisma.microInteraction.create({
    data: { microContentId: id, userId: (req.user as any).id },
  });

  res.json({ ok: true });
});

export default r;
