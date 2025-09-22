import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/** LISTA PÚBLICA DE BIBLIOTECAS */
router.get("/libraries", async (_req, res) => {
  try {
    const libs = await prisma.library.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json({ items: libs });
  } catch (e) {
    console.error("GET /public/libraries", e);
    res.status(500).json({ error: "failed_to_list_libraries" });
  }
});

export default router;
