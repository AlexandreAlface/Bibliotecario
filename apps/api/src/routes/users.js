// src/routes/users.js
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "./auth.js";

const router = Router();

// Opcional: devolver o perfil normalizado (se precisares)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: Number(req.user.sub) },
      select: {
        id: true, fullName: true, email: true,
        phone: true, citizenCard: true, address: true,
      },
    });
    if (!u) return res.status(404).json({ error: "Utilizador não encontrado" });
    res.json(u);
  } catch (e) { next(e); }
});

// PATCH /api/users/me  → atualiza campos do utilizador autenticado
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { fullName, email, phone, citizenCard, address } = req.body || {};
    const data = {
      ...(fullName !== undefined && { fullName: String(fullName) }),
      ...(email    !== undefined && { email: String(email) }),
      ...(phone    !== undefined && { phone: phone ?? null }),
      ...(citizenCard !== undefined && { citizenCard: citizenCard ?? null }),
      ...(address  !== undefined && { address: address ?? null }),
    };

    const u = await prisma.user.update({
      where: { id: Number(req.user.sub) },
      data,
      select: {
        id: true, fullName: true, email: true,
        phone: true, citizenCard: true, address: true,
      },
    });

    res.json(u);
  } catch (e) {
    // conflito de email já existente
    if (e?.code === "P2002" && e?.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "E-mail já em uso" });
    }
    next(e);
  }
});

export default router;
