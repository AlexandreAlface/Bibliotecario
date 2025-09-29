import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

/**
 * Listagem básica
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
        ageRange: true,  // existe no teu modelo
        author: true,    // existe
        category: true,  // existe
        genres: true,    // existe (muitas vezes string[]/json)
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
    // se quiseres algo mais seguro que $queryRawUnsafe, troca para uma view ou para findMany com orderBy: { rand() }
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "isbn","title" FROM "Book" ORDER BY random() LIMIT 2`
    );
    res.json(rows.map((b) => ({ id: b.isbn, title: b.title })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/books/:isbn
 * Restringe o param com regex para não colidir com /current, /suggestions, etc.
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
        author: true,    // <- existe no teu modelo
        category: true,  // <- existe no teu modelo
        genres: true,    // <- normalmente string[]/json
      },
    });

    if (!book) return res.status(404).json({ error: "not_found" });

    const authors =
      typeof book.author === "string" && book.author.trim()
        ? [book.author.trim()]
        : Array.isArray(book.author)
        ? book.author.filter(Boolean).map(String)
        : [];

    let categories = [];
    if (Array.isArray(book.genres)) categories = book.genres.filter(Boolean).map(String);
    else if (typeof book.category === "string" && book.category.trim()) categories = [book.category.trim()];

    res.json({
      isbn: book.isbn,
      title: book.title,
      coverUrl: book.coverUrl,
      summary: book.summary,
      publicationYear: book.publicationYear ?? null,
      ageRange: book.ageRange ?? null,
      authors,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
