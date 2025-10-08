// src/routes/children.ts
// Autor: Alexandre Brissos 21131
// O que faz: CRUD mínimo de crianças para a família autenticada.
// Inclui helpers “puros” (parse de datas, mapeamento) e handlers ≤ ~30 linhas.

import { Router, type RequestHandler } from "express";
import { prisma } from "../../prisma";
import { requireAuth } from "./auth";

const router = Router();

/* ---------------- Helpers “puros” ---------------- */
type JsonChild = {
  id: number;
  name: string;
  birthDate: string | null;
  gender: string | null;
  readerProfile: string | null;
  avatarUrl: null;
};

const parseBirthDate = (input: unknown): Date | null => {
  if (!input) return null;
  const d = new Date(String(input));
  return Number.isNaN(d.getTime()) ? null : d;
};

const toJsonChild = (c: {
  id: number;
  name: string;
  birthDate: Date | null;
  gender: string | null;
  readerProfile: string | null;
}): JsonChild => ({
  id: c.id,
  name: c.name,
  birthDate: c.birthDate ? c.birthDate.toISOString() : null,
  gender: c.gender,
  readerProfile: c.readerProfile,
  avatarUrl: null,
});

async function assertBelongsToFamily(childId: number, familyId: number) {
  const link = await prisma.childFamily.findUnique({
    where: { childId_familyId: { childId, familyId } },
    select: { childId: true },
  });
  if (!link) throw Object.assign(new Error("not_found"), { status: 404 });
}

/* ---------------- Handlers (≤ ~30 linhas) ---------------- */

// POST /api/children — cria criança e liga à família autenticada
const createChild: RequestHandler = async (req, res, next) => {
  try {
    const { name, birthDate, gender, readerProfile } = (req.body || {}) as any;
    if (!String(name || "").trim())
      return res.status(400).json({ error: "Nome obrigatório" });

    const bd =
      parseBirthDate(birthDate) ??
      new Date(new Date().getFullYear() - 6, 0, 1);

    const familyId = Number((req as any).user?.sub);
    if (!Number.isFinite(familyId))
      return res.status(401).json({ error: "unauthenticated" });

    const child = await prisma.child.create({
      data: {
        name: String(name).trim(),
        birthDate: bd,
        gender: gender || null,
        readerProfile: readerProfile || null,
        families: { create: { familyId } },
      },
      select: { id: true, name: true, birthDate: true, gender: true, readerProfile: true },
    });

    return res.status(201).json(toJsonChild(child));
  } catch (e) {
    next(e);
  }
};

// PATCH /api/children/:id — atualiza apenas campos enviados
const updateChild: RequestHandler = async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const familyId = Number((req as any).user?.sub);
    await assertBelongsToFamily(childId, familyId);

    const data: any = {};
    if (typeof (req.body as any).name === "string")
      data.name = String((req.body as any).name).trim();
    if ((req.body as any).birthDate) {
      const bd = parseBirthDate((req.body as any).birthDate);
      if (bd) data.birthDate = bd;
    }
    if ("gender" in (req.body as any)) data.gender = (req.body as any).gender || null;
    if ("readerProfile" in (req.body as any))
      data.readerProfile = (req.body as any).readerProfile || null;

    const child = await prisma.child.update({
      where: { id: childId },
      data,
      select: { id: true, name: true, birthDate: true, gender: true, readerProfile: true },
    });

    res.json(toJsonChild(child));
  } catch (e: any) {
    if (e?.status === 404) return res.status(404).json({ error: "not_found" });
    next(e);
  }
};

// DELETE /api/children/:id — apaga (cascata no schema)
const deleteChild: RequestHandler = async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const familyId = Number((req as any).user?.sub);
    await assertBelongsToFamily(childId, familyId);

    await prisma.child.delete({ where: { id: childId } });
    res.status(204).end();
  } catch (e: any) {
    if (e?.status === 404) return res.status(404).json({ error: "not_found" });
    next(e);
  }
};

/* ---------------- Wire-up ---------------- */
router.post("/children", requireAuth as any, createChild);
router.patch("/children/:id", requireAuth as any, updateChild);
router.delete("/children/:id", requireAuth as any, deleteChild);

export default router;
