import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const userId = Number(req?.user?.sub ?? req?.user?.id ?? req?.session?.userId);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  (req as any).authUserId = userId;
  next();
}

/** Bibliotecas do utilizador autenticado */
router.get("/libraries/mine", requireAuth, async (req: any, res) => {
  try {
    const userId = Number(req.authUserId);
    const libs = await prisma.library.findMany({
      where: { userLibraries: { some: { userId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json({ items: libs });
  } catch (e) {
    console.error("GET /libraries/mine", e);
    res.status(500).json({ error: "failed_to_list_libraries" });
  }
});

// opcional: alias com ?scope=mine
router.get("/libraries", requireAuth, async (req, res) => {
  if (String(req.query.scope || "").toLowerCase() === "mine") {
    (req as any).authUserId = Number((req as any)?.user?.sub ?? 0);
    const userId = Number((req as any).authUserId);
    const libs = await prisma.library.findMany({
      where: { userLibraries: { some: { userId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return res.json({ items: libs });
  }
  return res.status(400).json({ error: "unsupported_scope" });
});

export default router;
