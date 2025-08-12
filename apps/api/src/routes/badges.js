// src/routes/badges.js
import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /api/badges
// Lista todas as badges
router.get('/badges', async (req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(badges);
  } catch (err) {
    next(err);
  }
});

// GET /api/badges/:id
// Retorna uma badge pelo ID
router.get('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const badge = await prisma.badge.findUnique({
      where: { id: Number(id) }
    });
    if (!badge) return res.status(404).json({ error: 'Badge não encontrada' });
    res.json(badge);
  } catch (err) {
    next(err);
  }
});

// POST /api/badges
// Cria uma nova badge
router.post('/badges', async (req, res, next) => {
  try {
    const { name, type, criteria } = req.body;
    const badge = await prisma.badge.create({
      data: { name, type, criteria }
    });
    res.status(201).json(badge);
  } catch (err) {
    // se violar unique constraint em “name”
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe uma badge com esse nome' });
    }
    next(err);
  }
});

// PUT /api/badges/:id
// Atualiza uma badge existente
router.put('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, criteria } = req.body;
    const badge = await prisma.badge.update({
      where: { id: Number(id) },
      data: { name, type, criteria }
    });
    res.json(badge);
  } catch (err) {
    if (err.code === 'P2025') {
      // Prisma: record not found
      return res.status(404).json({ error: 'Badge não encontrada' });
    }
    next(err);
  }
});

// DELETE /api/badges/:id
// Elimina uma badge
router.delete('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.badge.delete({
      where: { id: Number(id) }
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Badge não encontrada' });
    }
    next(err);
  }
});

export default router;
