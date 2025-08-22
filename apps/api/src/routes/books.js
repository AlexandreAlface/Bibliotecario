// src/routes/books.js
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/books
// Devolve lista de livros (pode depois adicionar filtros, paginação, etc.)
router.get("/books", async (req, res, next) => {
  try {
    const books = await prisma.book.findMany();
    res.json(books);
  } catch (err) {
    next(err); // vai para o error handler do Express
  }
});

// Lista geral
router.get("/", async (_req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      take: 50,
      orderBy: { title: "asc" },
    });
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// Leituras atuais (placeholder — podes ligar à tua lógica de Reading)
router.get("/current", async (_req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      take: 2,
      orderBy: { publicationYear: "desc" },
    });
    res.json(books.map((b) => ({ id: b.isbn, title: b.title, date: "10/07" })));
  } catch (err) {
    next(err);
  }
});

// Sugestões (placeholder — por agora devolve 2 aleatórios)
router.get("/suggestions", async (_req, res, next) => {
  try {
    const books = await prisma.$queryRawUnsafe(`
      SELECT isbn, title FROM "Book" ORDER BY random() LIMIT 2
    `);
    res.json(books.map((b) => ({ id: b.isbn, title: b.title })));
  } catch (err) {
    next(err);
  }
});

export default router;
