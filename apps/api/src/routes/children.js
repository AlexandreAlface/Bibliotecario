// src/routes/children.js
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "./auth.js";

const router = Router();

// helper para validar pertença da criança à família logada
async function assertBelongsToFamily(childId, familyId) {
  const link = await prisma.childFamily.findUnique({
    where: {
      childId_familyId: {
        childId: Number(childId),
        familyId: Number(familyId),
      },
    },
  });
  if (!link) throw Object.assign(new Error("not_found"), { status: 404 });
}

function parseBirthDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d) ? null : d;
}

// POST /api/children  -> cria criança e liga à família autenticada
router.post("/children", requireAuth, async (req, res, next) => {
  try {
    const { name, birthDate, gender, readerProfile } = req.body || {};
    if (!name?.trim())
      return res.status(400).json({ error: "Nome obrigatório" });

    // birthDate é obrigatório no schema → se não vier, inventamos uma data aproximada (6 anos atrás)
    const bd =
      parseBirthDate(birthDate) ?? new Date(new Date().getFullYear() - 6, 0, 1);

    const child = await prisma.child.create({
      data: {
        name: name.trim(),
        birthDate: bd,
        gender: gender || null,
        readerProfile: readerProfile || null,
        families: { create: { familyId: Number(req.user.sub) } },
      },
    });

    return res.status(201).json({
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
      readerProfile: child.readerProfile,
      avatarUrl: null,
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/children/:id  -> atualiza dados (apenas os enviados)
router.patch("/children/:id", requireAuth, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    await assertBelongsToFamily(childId, req.user.sub);

    const data = {};
    if (typeof req.body.name === "string") data.name = req.body.name.trim();
    if (req.body.birthDate) {
      const bd = parseBirthDate(req.body.birthDate);
      if (bd) data.birthDate = bd;
    }
    if ("gender" in req.body) data.gender = req.body.gender || null;
    if ("readerProfile" in req.body)
      data.readerProfile = req.body.readerProfile || null;

    const child = await prisma.child.update({ where: { id: childId }, data });

    res.json({
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
      readerProfile: child.readerProfile,
      avatarUrl: null,
    });
  } catch (e) {
    if (e?.status === 404) return res.status(404).json({ error: "not_found" });
    next(e);
  }
});

// DELETE /api/children/:id
router.delete("/children/:id", requireAuth, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    await assertBelongsToFamily(childId, req.user.sub);

    await prisma.child.delete({ where: { id: childId } }); // 🎉 sem limpeza manual

    res.status(204).end();
  } catch (e) {
    if (e?.status === 404) return res.status(404).json({ error: "not_found" });
    next(e);
  }
});

export default router;
