import { Router } from "express";
import { prisma } from "../prisma.js";
import { Prisma } from "@prisma/client";

const router = Router();

/**
 * Helpers
 */
function num(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function str(v: any): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
}

/**
 * Listagem básica (máx. 50) — opcional
 * GET /api/books
 */
router.get("/", async (req, res, next) => {
  try {
    const take = Math.min(50, Number(req.query.limit) || 50);
    const books = await prisma.book.findMany({
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
  } catch (err) {
    next(err);
  }
});

/**
 * Exemplos que não devem ser apanhados por :isbn
 * (coloca SEMPRE antes de :isbn)
 */
router.get("/current", async (_req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      take: 2,
      orderBy: { publicationYear: "desc" },
      select: { isbn: true, title: true },
    });
    res.json(books.map((b) => ({ id: b.isbn, title: b.title })));
  } catch (err) {
    next(err);
  }
});
router.get("/suggestions", async (_req, res, next) => {
  try {
    const rows = await prisma.$queryRaw<{ isbn: string; title: string }[]>`
      SELECT "isbn","title"
      FROM "Book"
      ORDER BY random()
      LIMIT 2
    `;

    res.json(rows.map((b) => ({ id: b.isbn, title: b.title })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/books/search
 * Busca paginada com filtros. Se vier libraryId, tenta primeiro nessa biblioteca
 * e, se não houver resultados, faz fallback para global (sem biblioteca).
 */
router.get("/search", async (req, res, next) => {
  try {
    const q = str(req.query.q);
    const author = str(req.query.author);
    const category = str(req.query.category);
    const yearFrom = num(req.query.yearFrom);
    const yearTo = num(req.query.yearTo);
    const ageMin = num(req.query.ageMin);
    const ageMax = num(req.query.ageMax);
    const libraryId = num(req.query.libraryId);

    const page = Math.max(1, num(req.query.page) ?? 1);
    const perPage = Math.max(1, Math.min(50, num(req.query.perPage) ?? 12));
    const skip = (page - 1) * perPage;

    // where base (sem biblioteca)
    const whereBase: Prisma.BookWhereInput = {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { summary: { contains: q, mode: "insensitive" } },
                { author: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                // géneros (string[])
                { genres: { has: q } },
              ],
            }
          : {},
        author ? { author: { contains: author, mode: "insensitive" } } : {},
        category
          ? {
              OR: [
                { category: { contains: category, mode: "insensitive" } },
                { genres: { has: category } },
              ],
            }
          : {},
        yearFrom ? { publicationYear: { gte: yearFrom } } : {},
        yearTo ? { publicationYear: { lte: yearTo } } : {},
        // tenta usar ageMin/ageMax se existirem; caso contrário, casa por texto em ageRange
        ageMin
          ? {
              OR: [
                { ageMin: { gte: ageMin } },
                { ageRange: { contains: String(ageMin), mode: "insensitive" } },
              ],
            }
          : {},
        ageMax
          ? {
              OR: [
                { ageMax: { lte: ageMax } },
                { ageRange: { contains: String(ageMax), mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    // se vier libraryId, adiciona filtro por holdings nessa biblioteca
    const whereWithLibrary: Prisma.BookWhereInput | undefined = libraryId
      ? {
          AND: [
            whereBase,
            { libraries: { some: { libraryId: Number(libraryId) } } },
          ],
        }
      : undefined;

    // 1) tenta com biblioteca (se foi pedida)
    let where = whereWithLibrary ?? whereBase;

    let total = await prisma.book.count({ where });
    // fallback automático: se com biblioteca não houver nada, volta a global
    if (libraryId && total === 0) {
      where = whereBase;
      total = await prisma.book.count({ where });
      console.log(
        `[books/search] fallback sem biblioteca (libraryId=${libraryId})`
      );
    }

    const rows = await prisma.book.findMany({
      where,
      select: {
        isbn: true,
        title: true,
        coverUrl: true,
        summary: true,
      },
      orderBy: { title: "asc" },
      skip,
      take: perPage,
    });

    res.json({
      items: rows,
      total,
      page,
      perPage,
    });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/books/:isbn
 * Detalhe completo + holdings por biblioteca
 */
router.get("/:isbn", async (req, res, next) => {
  try {
    const raw = String(req.params.isbn || "");
    const isbn = raw.replace(/-/g, "").toUpperCase();
    if (!isbn) return res.status(400).json({ error: "bad_isbn" });

    const book = await prisma.book.findUnique({
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

    if (!book) return res.status(404).json({ error: "not_found" });

    const authors =
      typeof book.author === "string" && book.author.trim()
        ? [book.author.trim()]
        : Array.isArray(book.author)
        ? book.author.filter(Boolean).map(String)
        : [];

    const categories = [];
    if (Array.isArray(book.genres))
      categories.push(...book.genres.filter(Boolean).map(String));
    if (typeof book.category === "string" && book.category.trim())
      categories.push(book.category.trim());

    res.json({
      isbn: book.isbn,
      title: book.title,
      coverUrl: book.coverUrl,
      summary: book.summary,
      publicationYear: book.publicationYear ?? null,
      ageRange: book.ageRange ?? null,
      authors,
      categories,
      holdings: (book.libraries || []).map((lb) => ({
        libraryId: lb.libraryId,
        libraryName: lb.library?.name ?? String(lb.libraryId),
        quantity: lb.quantity ?? null,
        shelfCode: lb.shelfCode ?? null,
        accessionNo: lb.accessionNo ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
