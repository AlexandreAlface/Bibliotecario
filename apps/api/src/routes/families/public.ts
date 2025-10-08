// apps/api/src/routes/public-libraries.ts
// Autor: Alexandre Brissos 21131
// O que faz: lista pública de bibliotecas (id + name).

import { Router, type Request, type Response } from "express";
import { prisma } from "../../prisma";

const router = Router();

/* -------- Service (curto) -------- */
export async function listPublicLibraries() {
  return prisma.library.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/* -------- Route (handler < 30 linhas) -------- */
router.get("/libraries", async (_req: Request, res: Response) => {
  try {
    const items = await listPublicLibraries();
    res.json({ items });
  } catch (e) {
    console.error("GET /public/libraries", e);
    res.status(500).json({ error: "failed_to_list_libraries" });
  }
});

export default router;
