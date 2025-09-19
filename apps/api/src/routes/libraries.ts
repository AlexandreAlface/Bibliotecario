// apps/api/src/routes/libraries.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/** Middleware simples: espera que um middleware de auth anterior tenha posto req.user.id */
function requireAuth(req: any, res: any, next: any) {
  const userId = Number(req?.user?.id ?? req?.session?.userId);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  req.authUserId = userId;
  next();
}

/** Handler que devolve as bibliotecas do utilizador autenticado */
async function handleListMyLibraries(req: any, res: any) {
  const userId: number = Number(req.authUserId);

  try {
    const libs = await prisma.library.findMany({
      where: { userLibraries: { some: { userId } } }, // ← UserLibrary liga user ↔ library
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    res.json({ items: libs });
  } catch (e: any) {
    console.error("GET /libraries/mine error:", e);
    res.status(500).json({ error: "failed_to_list_libraries" });
  }
}

// rota canónica
router.get("/libraries/mine", requireAuth, handleListMyLibraries);

// alias p/ compatibilidade com tentativas anteriores
router.get("/libraries", requireAuth, async (req, res, next) => {
  if (String(req.query.scope).toLowerCase() === "mine") {
    return handleListMyLibraries(req as any, res as any);
  }
  // se quiseres permitir “todas as bibliotecas” para admins, podes implementar aqui.
  return res.status(400).json({ error: "unsupported_scope" });
});

// outro alias p/ páginas de métricas
router.get("/admin/metrics/libraries", requireAuth, handleListMyLibraries);

export default router;
