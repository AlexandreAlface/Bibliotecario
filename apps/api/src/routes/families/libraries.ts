// apps/api/src/routes/libraries.ts
// Autor: Alexandre Brissos 21131
// O que faz: devolve as bibliotecas do utilizador autenticado.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import { prisma } from "../../prisma";

type AnyReq = Request & {
  user?: { sub?: number; id?: number } | null;
  session?: { userId?: number };
  authUserId?: number;
};

/* ---------- Helpers PUROS ---------- */
const toUserId = (r: Pick<AnyReq, "user" | "session">): number | null => {
  const id = Number(r.user?.sub ?? r.user?.id ?? r.session?.userId);
  return Number.isFinite(id) && id > 0 ? id : null;
};
const libWhere = (userId: number) => ({ userLibraries: { some: { userId } } });
const libSelect = { id: true, name: true } as const;
const asList = (rows: { id: number; name: string }[]) => ({ items: rows });

/* ---------- Middleware fino ---------- */
const requireAuth: RequestHandler = (req, res, next) => {
  const uid = toUserId(req as AnyReq);
  if (!uid) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as AnyReq).authUserId = uid;
  next();
};

const router = Router();

/* ---------- Rotas (<30 linhas) ---------- */

// GET /libraries/mine
router.get("/libraries/mine", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AnyReq).authUserId!;
    const rows = await prisma.library.findMany({
      where: libWhere(userId),
      select: libSelect,
      orderBy: { name: "asc" },
    });
    res.json(asList(rows));
  } catch (e) {
    console.error("GET /libraries/mine", e);
    next(e);
  }
});

// GET /libraries?scope=mine (alias)
router.get("/libraries", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (String(req.query.scope || "").toLowerCase() !== "mine") {
      res.status(400).json({ error: "unsupported_scope" });
      return;
    }
    const userId = (req as AnyReq).authUserId!;
    const rows = await prisma.library.findMany({
      where: libWhere(userId),
      select: libSelect,
      orderBy: { name: "asc" },
    });
    res.json(asList(rows));
  } catch (e) {
    console.error("GET /libraries", e);
    next(e);
  }
});

export default router;
