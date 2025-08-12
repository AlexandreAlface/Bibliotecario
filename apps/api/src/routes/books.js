// src/routes/books.js
import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /api/books
// Devolve lista de livros (pode depois adicionar filtros, paginação, etc.)
router.get('/books', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany();
    res.json(books);
  } catch (err) {
    next(err); // vai para o error handler do Express
  }
});

export default router;
