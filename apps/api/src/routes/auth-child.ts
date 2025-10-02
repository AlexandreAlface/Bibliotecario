// src/routes/auth-child.ts
// Autor: Alexandre Brissos 21131
// O que faz: permite à família “assumir” um filho (grava cookie seguro)
// e limpar esse estado. Inclui helpers puros para opções de cookie
// e verificação de pertença.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type CookieOptions,
} from "express";
import { prisma } from "../prisma";
import { requireAuth } from "./auth";

const router = Router();

const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const isProd = process.env.NODE_ENV === "production";

/* -------- Helpers puros (curtos) -------- */
export function makeActingCookieOptions(opts: {
  secure: boolean;
  domain?: string;
}): CookieOptions {
  return {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
    domain: opts.domain,
  };
}

export async function belongsToFamily(
  childId: number,
  familyId: number
): Promise<boolean> {
  const link = await prisma.childFamily.findUnique({
    where: { childId_familyId: { childId, familyId } },
    select: { childId: true },
  });
  return !!link;
}

/* -------- Helpers de resposta -------- */
function setActingCookie(res: Response, childId: number) {
  res.cookie(
    ACTING_COOKIE,
    String(childId),
    makeActingCookieOptions({ secure: isProd, domain: COOKIE_DOMAIN })
  );
}
function clearActingCookie(res: Response) {
  res.clearCookie(ACTING_COOKIE, {
    path: "/",
    domain: COOKIE_DOMAIN,
  });
}

/* -------- Rotas -------- */
router.post(
  "/auth/act-as-child",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const childId = Number((req.body as any)?.childId);
      const familyId = Number((req as any).user?.sub);
      if (!Number.isFinite(childId))
        return res.status(400).json({ error: "invalid_childId" });
      if (!Number.isFinite(familyId))
        return res.status(401).json({ error: "unauthenticated" });

      const ok = await belongsToFamily(childId, familyId);
      if (!ok)
        return res
          .status(403)
          .json({ error: "Child não pertence à tua família" });

      setActingCookie(res, childId);
      res.json({ ok: true, actingChildId: childId });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/auth/act-as-clear",
  requireAuth,
  async (_req: Request, res: Response) => {
    clearActingCookie(res);
    res.json({ ok: true });
  }
);

export default router;
