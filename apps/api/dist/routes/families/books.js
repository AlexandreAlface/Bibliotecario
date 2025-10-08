"use strict";
// apps/api/src/routes/books.ts
// Autor: Alexandre Brissos 21131
// O que faz: rota /api/books (listagem básica, “current”, “suggestions”,
// pesquisa paginada com filtros e detalhe por ISBN). Usa helpers puros
// e mantém cada método abaixo de ~30 linhas.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../prisma");
const r = (0, express_1.Router)();
/* -------------------- Helpers puros -------------------- */
const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const str = (v) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : undefined;
};
function parseSearchParams(qs) {
    const page = Math.max(1, num(qs.page) ?? 1);
    const perPage = Math.max(1, Math.min(50, num(qs.perPage) ?? 12));
    return {
        q: str(qs.q),
        author: str(qs.author),
        category: str(qs.category),
        yearFrom: num(qs.yearFrom),
        yearTo: num(qs.yearTo),
        ageMin: num(qs.ageMin),
        ageMax: num(qs.ageMax),
        libraryId: num(qs.libraryId),
        page,
        perPage,
        skip: (page - 1) * perPage,
    };
}
function buildWhereBase(p) {
    return {
        AND: [
            p.q
                ? {
                    OR: [
                        { title: { contains: p.q, mode: "insensitive" } },
                        { summary: { contains: p.q, mode: "insensitive" } },
                        { author: { contains: p.q, mode: "insensitive" } },
                        { category: { contains: p.q, mode: "insensitive" } },
                        { genres: { has: p.q } },
                    ],
                }
                : {},
            p.author ? { author: { contains: p.author, mode: "insensitive" } } : {},
            p.category
                ? {
                    OR: [
                        { category: { contains: p.category, mode: "insensitive" } },
                        { genres: { has: p.category } },
                    ],
                }
                : {},
            p.yearFrom ? { publicationYear: { gte: p.yearFrom } } : {},
            p.yearTo ? { publicationYear: { lte: p.yearTo } } : {},
            p.ageMin
                ? {
                    OR: [
                        { ageMin: { gte: p.ageMin } },
                        { ageRange: { contains: String(p.ageMin), mode: "insensitive" } },
                    ],
                }
                : {},
            p.ageMax
                ? {
                    OR: [
                        { ageMax: { lte: p.ageMax } },
                        { ageRange: { contains: String(p.ageMax), mode: "insensitive" } },
                    ],
                }
                : {},
        ],
    };
}
function withLibraryFilter(base, libraryId) {
    if (!libraryId)
        return base;
    return { AND: [base, { libraries: { some: { libraryId } } }] };
}
async function searchWithFallback(base, libraryId, skip, take) {
    let where = withLibraryFilter(base, libraryId);
    let total = await prisma_1.prisma.book.count({ where });
    if (libraryId && total === 0) {
        where = base;
        total = await prisma_1.prisma.book.count({ where });
    }
    const items = await prisma_1.prisma.book.findMany({
        where,
        select: { isbn: true, title: true, coverUrl: true, summary: true },
        orderBy: { title: "asc" },
        skip,
        take,
    });
    return { items, total };
}
function mapBookDetail(b) {
    const authors = typeof b.author === "string" && b.author.trim()
        ? [b.author.trim()]
        : Array.isArray(b.author)
            ? b.author.filter(Boolean).map(String)
            : [];
    const categories = [];
    if (Array.isArray(b.genres))
        categories.push(...b.genres.filter(Boolean));
    if (typeof b.category === "string" && b.category.trim())
        categories.push(b.category.trim());
    return {
        isbn: b.isbn,
        title: b.title,
        coverUrl: b.coverUrl,
        summary: b.summary,
        publicationYear: b.publicationYear ?? null,
        ageRange: b.ageRange ?? null,
        authors,
        categories,
        holdings: (b.libraries || []).map((lb) => ({
            libraryId: lb.libraryId,
            libraryName: lb.library?.name ?? String(lb.libraryId),
            quantity: lb.quantity ?? null,
            shelfCode: lb.shelfCode ?? null,
            accessionNo: lb.accessionNo ?? null,
        })),
    };
}
/* -------------------- Handlers (≤ ~30 linhas) -------------------- */
// GET /api/books  — listagem simples
const listBasic = async (req, res, next) => {
    try {
        const take = Math.min(50, Number(req.query.limit) || 50);
        const books = await prisma_1.prisma.book.findMany({
            take,
            orderBy: { title: "asc" },
            select: {
                isbn: true,
                title: true,
                coverUrl: true,
                summary: true,
                publicationYear: true,
                ageRange: true,
                author: true,
                category: true,
                genres: true,
            },
        });
        res.json(books);
    }
    catch (e) {
        next(e);
    }
};
// GET /api/books/current  — 2 mais recentes (exemplo)
const listCurrent = async (_req, res, next) => {
    try {
        const rows = await prisma_1.prisma.book.findMany({
            take: 2,
            orderBy: { publicationYear: "desc" },
            select: { isbn: true, title: true },
        });
        res.json(rows.map((b) => ({ id: b.isbn, title: b.title })));
    }
    catch (e) {
        next(e);
    }
};
// GET /api/books/suggestions  — 2 aleatórios
const listSuggestions = async (_req, res, next) => {
    try {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT "isbn","title" FROM "Book" ORDER BY random() LIMIT 2
    `;
        res.json(rows.map((b) => ({ id: b.isbn, title: b.title })));
    }
    catch (e) {
        next(e);
    }
};
// GET /api/books/search  — pesquisa paginada + fallback por biblioteca
const searchBooks = async (req, res, next) => {
    try {
        const p = parseSearchParams(req.query);
        const base = buildWhereBase(p);
        const { items, total } = await searchWithFallback(base, p.libraryId, p.skip, p.perPage);
        res.json({ items, total, page: p.page, perPage: p.perPage });
    }
    catch (e) {
        next(e);
    }
};
// GET /api/books/:isbn  — detalhe + holdings
const getByIsbn = async (req, res, next) => {
    try {
        const isbn = String(req.params.isbn || "").replace(/-/g, "").toUpperCase();
        if (!isbn)
            return res.status(400).json({ error: "bad_isbn" });
        const b = await prisma_1.prisma.book.findUnique({
            where: { isbn },
            select: {
                isbn: true,
                title: true,
                coverUrl: true,
                summary: true,
                publicationYear: true,
                ageRange: true,
                author: true,
                category: true,
                genres: true,
                libraries: {
                    select: {
                        libraryId: true,
                        quantity: true,
                        shelfCode: true,
                        accessionNo: true,
                        library: { select: { id: true, name: true } },
                    },
                    orderBy: { libraryId: "asc" },
                },
            },
        });
        if (!b)
            return res.status(404).json({ error: "not_found" });
        res.json(mapBookDetail(b));
    }
    catch (e) {
        next(e);
    }
};
/* -------------------- Wire-up -------------------- */
r.get("/", listBasic);
r.get("/current", listCurrent);
r.get("/suggestions", listSuggestions);
r.get("/search", searchBooks);
r.get("/:isbn", getByIsbn);
exports.default = r;
