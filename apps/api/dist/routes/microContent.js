"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/microContent.ts
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const prisma_js_1 = require("../prisma.js");
const client_1 = require("@prisma/client");
const r = (0, express_1.Router)();
function requireUser(req, res) {
    if (!req.user) {
        // podes também lançar erro; aqui devolvo 401 de forma explícita
        res.status(401).json({ error: "unauthenticated" });
        // Hack para TypeScript perceber que daqui para a frente a função não prossegue
        throw new Error("unauthenticated");
    }
}
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
    libraryId: zod_1.default
        .string()
        .regex(/^\d+$/)
        .transform((s) => Number(s))
        .optional(),
    page: zod_1.default
        .string()
        .regex(/^\d+$/)
        .transform((s) => Number(s))
        .optional(),
    limit: zod_1.default
        .string()
        .regex(/^\d+$/)
        .transform((s) => Number(s))
        .optional(),
});
function normalizeTags(raw) {
    const arr = Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\n;]+/g); // também aceita "a,b;c\nd"
    const cleaned = arr
        .map((s) => String(s).trim())
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " ")) // colapsar espaços internos
        .map((s) => s.slice(0, 64)); // limite “defensivo”
    return Array.from(new Set(cleaned.map((t) => t))); // se preferires, .toLowerCase()
}
function normalizeIsbns(raw) {
    const arr = Array.isArray(raw) ? raw : String(raw ?? "").split(/[,\s;]+/g); // vírgula, espaço, ; e quebras de linha
    const cleaned = arr
        .map((s) => String(s).replace(/[-\s]/g, "").toUpperCase())
        .filter(Boolean)
        .filter((s) => /^\d{13}$|^\d{9}(\d|X)$/.test(s)); // ISBN-13 ou ISBN-10
    return Array.from(new Set(cleaned));
}
/* -------------------- Admin: CRUD -------------------- */
// GET /admin/micro-contents
r.get("/admin/micro-contents", async (req, res) => {
    requireUser(req, res);
    const q = QueryListSchema.safeParse(req.query);
    if (!q.success)
        return res.status(400).json({ error: "bad_query" });
    const { q: query, type, tag, libraryId, page = 1, limit = 20 } = q.data;
    const where = {};
    if (libraryId != null)
        where.libraryId = libraryId;
    if (type)
        where.type = type;
    if (tag)
        where.tags = { has: tag };
    if (query && query.trim()) {
        where.OR = [
            { text: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_js_1.prisma.microContent.count({ where }),
        prisma_js_1.prisma.microContent.findMany({
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
            author: mc.author ? { id: mc.author.id, name: mc.author.fullName } : null,
            createdAt: mc.createdAt,
            updatedAt: mc.updatedAt,
        })),
    });
});
// POST /admin/micro-contents
r.post("/admin/micro-contents", async (req, res) => {
    requireUser(req, res);
    const parsed = UpsertSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "bad_body" });
    // normalizar/validar
    const text = parsed.data.text;
    const type = parsed.data.type;
    const tags = normalizeTags(parsed.data.tags);
    const bookIsbns = normalizeIsbns(parsed.data.bookIsbns);
    const isPublished = parsed.data.isPublished;
    const publishedAt = parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : undefined;
    // (opcional) se quiseres forçar à biblioteca do admin no servidor:
    // const defaultLibraryId = (req.user as any)?.userLibraries?.[0]?.libraryId;
    const libraryId = parsed.data.libraryId ?? undefined;
    try {
        const created = await prisma_js_1.prisma.$transaction(async (tx) => {
            const mc = await tx.microContent.create({
                data: {
                    text,
                    type,
                    tags,
                    isPublished,
                    publishedAt,
                    libraryId,
                    authorId: req.user?.id ?? undefined,
                },
            });
            if (bookIsbns.length) {
                const existing = await tx.book.findMany({
                    where: { isbn: { in: bookIsbns } },
                    select: { isbn: true },
                });
                if (existing.length) {
                    await tx.microContentBook.createMany({
                        data: existing.map((b) => ({
                            microContentId: mc.id,
                            bookIsbn: b.isbn,
                        })),
                        skipDuplicates: true,
                    });
                }
            }
            return mc;
        });
        res.json({ ok: true, id: created.id });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "create_failed" });
    }
});
// PUT /admin/micro-contents/:id
r.put("/admin/micro-contents/:id", async (req, res) => {
    requireUser(req, res);
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ error: "bad_id" });
    const parsed = UpsertSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "bad_body" });
    const text = parsed.data.text;
    const type = parsed.data.type;
    const tags = normalizeTags(parsed.data.tags);
    const bookIsbns = normalizeIsbns(parsed.data.bookIsbns);
    const isPublished = parsed.data.isPublished;
    const publishedAt = parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : undefined;
    const libraryId = parsed.data.libraryId ?? null;
    try {
        await prisma_js_1.prisma.$transaction(async (tx) => {
            await tx.microContent.update({
                where: { id },
                data: {
                    text,
                    type,
                    tags,
                    isPublished,
                    publishedAt,
                    libraryId,
                },
            });
            // substituir associações (só para livros existentes)
            await tx.microContentBook.deleteMany({ where: { microContentId: id } });
            if (bookIsbns.length) {
                const existing = await tx.book.findMany({
                    where: { isbn: { in: bookIsbns } },
                    select: { isbn: true },
                });
                if (existing.length) {
                    await tx.microContentBook.createMany({
                        data: existing.map((b) => ({
                            microContentId: id,
                            bookIsbn: b.isbn,
                        })),
                        skipDuplicates: true,
                    });
                }
            }
        });
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "update_failed" });
    }
});
// DELETE /admin/micro-contents/:id
r.delete("/admin/micro-contents/:id", async (req, res) => {
    requireUser(req, res);
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ error: "bad_id" });
    await prisma_js_1.prisma.microContent.delete({ where: { id } });
    res.json({ ok: true });
});
/* -------------------- Público (família/filhos) -------------------- */
// GET /micro-contents
r.get("/micro-contents", async (req, res) => {
    const q = QueryListSchema.safeParse(req.query);
    if (!q.success)
        return res.status(400).json({ error: "bad_query" });
    const { q: query, type, tag, libraryId, page = 1, limit = 12 } = q.data;
    const where = { isPublished: true };
    if (libraryId != null)
        where.libraryId = libraryId;
    if (type)
        where.type = type;
    if (tag)
        where.tags = { has: tag };
    if (query && query.trim()) {
        where.OR = [
            { text: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
        ];
    }
    const userId = req.user?.id;
    const include = {
        books: {
            include: {
                book: {
                    select: { isbn: true, title: true, coverUrl: true, summary: true },
                },
            },
        },
        library: { select: { id: true, name: true } },
        _count: { select: { interactions: true } }, // 👈 total de interações
    };
    if (userId) {
        // 👇 devolve apenas interações do utilizador corrente (para sabermos se já viu)
        include.interactions = {
            where: { userId },
            select: { id: true },
        };
    }
    const [total, items] = await Promise.all([
        prisma_js_1.prisma.microContent.count({ where }),
        prisma_js_1.prisma.microContent.findMany({
            where,
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            include,
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
            // 👇 NOVO
            interactionsCount: mc._count?.interactions ?? 0,
            seen: userId ? (Array.isArray(mc.interactions) && mc.interactions.length > 0) : false,
        })),
    });
});
// POST /micro-interactions  { microContentId: number }
r.post("/micro-interactions", async (req, res) => {
    requireUser(req, res);
    const microContentId = Number(req.body?.microContentId);
    const userId = req.user.id;
    if (!Number.isFinite(microContentId))
        return res.status(400).json({ error: "bad_body" });
    await prisma_js_1.prisma.microInteraction.upsert({
        where: {
            userId_microContentId: { userId, microContentId },
        },
        update: {}, // nada a atualizar; só garantir existência
        create: { userId, microContentId },
    });
    res.json({ ok: true });
});
exports.default = r;
