"use strict";
// apps/api/src/routes/microContent.ts
// Autor: Alexandre Brissos 21131
// O que faz: CRUD de micro-conteúdos (admin) e listagem pública com interações.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
const r = (0, express_1.Router)();
/* -------------------- Schemas -------------------- */
const UpsertSchema = zod_1.default.object({
    text: zod_1.default.string().min(1),
    type: zod_1.default.nativeEnum(client_1.MicroContentType).default(client_1.MicroContentType.BIBLIOTERAPIA),
    tags: zod_1.default.array(zod_1.default.string().min(1)).default([]),
    libraryId: zod_1.default.number().int().optional().nullable(),
    bookIsbns: zod_1.default.array(zod_1.default.string().min(1)).default([]),
    isPublished: zod_1.default.boolean().default(true),
    publishedAt: zod_1.default.string().datetime().or(zod_1.default.date()).optional().nullable(),
});
const QueryListSchema = zod_1.default.object({
    q: zod_1.default.string().optional(),
    type: zod_1.default.nativeEnum(client_1.MicroContentType).optional(),
    tag: zod_1.default.string().optional(),
    libraryId: zod_1.default.string().regex(/^\d+$/).transform(Number).optional(),
    page: zod_1.default.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.default.string().regex(/^\d+$/).transform(Number).optional(),
});
/* -------------------- Helpers PUROS -------------------- */
const getUserId = (req) => Number(req.user?.id) > 0 ? Number(req.user?.id) : null;
const ensureUser = (req, res, next) => {
    const id = getUserId(req);
    if (!id)
        return void res.status(401).json({ error: "unauthenticated" });
    req.authUserId = id;
    next();
};
const normalizeTags = (raw) => Array.from(new Set((Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\n;]+/g))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " ").slice(0, 64))));
const normalizeIsbns = (raw) => Array.from(new Set((Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\s;]+/g))
    .map((s) => String(s).replace(/[-\s]/g, "").toUpperCase())
    .filter(Boolean)
    .filter((s) => /^\d{13}$|^\d{9}(\d|X)$/.test(s))));
const buildWhere = (q, publishedOnly) => {
    const where = publishedOnly ? { isPublished: true } : {};
    if (q.libraryId != null)
        where.libraryId = q.libraryId;
    if (q.type)
        where.type = q.type;
    if (q.tag)
        where.tags = { has: q.tag };
    if (q.q && q.q.trim())
        where.OR = [
            { text: { contains: q.q, mode: "insensitive" } },
            { tags: { has: q.q } },
        ];
    return where;
};
const mapAdminItem = (mc) => ({
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
    author: mc.author ? { id: mc.author.id, name: mc.author.fullName } : null,
    createdAt: mc.createdAt,
    updatedAt: mc.updatedAt,
});
const mapPublicItem = (mc, userId) => ({
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
    interactionsCount: mc._count?.interactions ?? 0,
    seen: Boolean(userId && Array.isArray(mc.interactions) && mc.interactions.length > 0),
});
/* -------------------- Services (puros/curtos) -------------------- */
const listMicroAdmin = async (where, page, limit) => {
    const [total, items] = await Promise.all([
        prisma_1.prisma.microContent.count({ where }),
        prisma_1.prisma.microContent.findMany({
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
const createMicro = async (payload, authorId) => {
    const { text, type, isPublished } = payload;
    const tags = normalizeTags(payload.tags);
    const bookIsbns = normalizeIsbns(payload.bookIsbns);
    const publishedAt = payload.publishedAt
        ? new Date(payload.publishedAt)
        : undefined;
    const libraryId = payload.libraryId ?? undefined;
    const mc = await prisma_1.prisma.$transaction(async (tx) => {
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
const updateMicro = async (id, payload) => {
    const { text, type, isPublished } = payload;
    const tags = normalizeTags(payload.tags);
    const bookIsbns = normalizeIsbns(payload.bookIsbns);
    const publishedAt = payload.publishedAt
        ? new Date(payload.publishedAt)
        : undefined;
    const libraryId = payload.libraryId ?? null;
    await prisma_1.prisma.$transaction(async (tx) => {
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
const listMicroPublic = async (where, page, limit, userId) => {
    const include = {
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
        prisma_1.prisma.microContent.count({ where }),
        prisma_1.prisma.microContent.findMany({
            where,
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            include,
        }),
    ]);
    return { total, items: items.map((mc) => mapPublicItem(mc, userId)) };
};
/* -------------------- Admin: CRUD (handlers < 30 linhas) -------------------- */
// GET /admin/micro-contents
r.get("/admin/micro-contents", ensureUser, async (req, res) => {
    const parsed = QueryListSchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: "bad_query" });
    const { page = 1, limit = 20 } = parsed.data;
    const where = buildWhere(parsed.data, false);
    const out = await listMicroAdmin(where, page, limit);
    res.json({ total: out.total, page, limit, items: out.items });
});
// POST /admin/micro-contents
r.post("/admin/micro-contents", ensureUser, async (req, res) => {
    const body = UpsertSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "bad_body" });
    try {
        const id = (await createMicro(body.data, req.authUserId))?.id;
        res.json({ ok: true, id });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "create_failed" });
    }
});
// PUT /admin/micro-contents/:id
r.put("/admin/micro-contents/:id", ensureUser, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ error: "bad_id" });
    const body = UpsertSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "bad_body" });
    try {
        await updateMicro(id, body.data);
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "update_failed" });
    }
});
// DELETE /admin/micro-contents/:id
r.delete("/admin/micro-contents/:id", ensureUser, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ error: "bad_id" });
    await prisma_1.prisma.microContent.delete({ where: { id } });
    res.json({ ok: true });
});
/* -------------------- Público -------------------- */
// GET /micro-contents
r.get("/micro-contents", async (req, res) => {
    const parsed = QueryListSchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: "bad_query" });
    const { page = 1, limit = 12 } = parsed.data;
    const where = buildWhere(parsed.data, true);
    const userId = getUserId(req) ?? undefined;
    const out = await listMicroPublic(where, page, limit, userId);
    res.json({ total: out.total, page, limit, items: out.items });
});
// POST /micro-interactions  { microContentId: number }
r.post("/micro-interactions", ensureUser, async (req, res) => {
    const microContentId = Number((req.body || {}).microContentId);
    if (!Number.isFinite(microContentId))
        return res.status(400).json({ error: "bad_body" });
    await prisma_1.prisma.microInteraction.upsert({
        where: {
            userId_microContentId: {
                userId: req.authUserId,
                microContentId,
            },
        },
        update: {},
        create: { userId: req.authUserId, microContentId },
    });
    res.json({ ok: true });
});
exports.default = r;
