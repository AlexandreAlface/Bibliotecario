// apps/api/src/middlewares/auth.ts
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Roles canónicos ---
export const ROLES = {
  FAMILY: "FAMÍLIA",
  LIBRARIAN: "BIBLIOTECÁRIO",
  CHILD: "CRIANÇA",
  ADMIN: "ADMIN",
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// O que colocamos em req.user
export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  roles: RoleName[];
  isFamily: boolean;
  isLibrarian: boolean;
  isChild: boolean;
  isAdmin: boolean;
};

// Augment Express types
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      actingChildId?: number | null;
    }
  }
}

// ------------ utils ------------
function toAuthUser(u: any): AuthUser {
  const roleNames: RoleName[] = (u.userRoles ?? [])
    .map((ur: any) => ur?.role?.name)
    .filter(Boolean);

  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    roles: roleNames,
    isFamily: roleNames.includes(ROLES.FAMILY),
    isLibrarian: roleNames.includes(ROLES.LIBRARIAN),
    isChild: roleNames.includes(ROLES.CHILD),
    isAdmin: roleNames.includes(ROLES.ADMIN),
  };
}

function unauthorized(res: Response, msg = "unauthenticated") {
  return res.status(401).json({ error: msg });
}
function forbidden(res: Response, msg = "forbidden") {
  return res.status(403).json({ error: msg });
}

// ------------ middleware brando (NÃO devolve 401) ------------
/**
 * withUser
 * - Tenta ler Bearer token ou cookie httpOnly
 * - Se existir e for válido, carrega utilizador + roles (req.user)
 * - Se não existir ou for inválido, segue sem bloquear (req.user = null)
 * - actingChildId: lê header `x-acting-child-id` OU cookie `bf_acting` (apenas família)
 */
export async function withUser(req: Request, _res: Response, next: NextFunction) {
  const COOKIE_NAME = process.env.COOKIE_NAME || "bf_access";
  const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
  const secret = process.env.JWT_SECRET;

  req.user = null;
  req.actingChildId = null;

  try {
    // 1) Authorization: Bearer
    let token: string | undefined;
    const h = req.header("authorization") || req.header("Authorization");
    if (h?.startsWith("Bearer ")) token = h.slice(7).trim();

    // 2) Cookie httpOnly
    if (!token && (req as any).cookies?.[COOKIE_NAME]) {
      token = (req as any).cookies[COOKIE_NAME];
    }

    if (!token || !secret) return next(); // segue sem user

    // Verifica token
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return next(); // token inválido → segue sem user
    }

    // Extrai userId de várias formas (id | sub | userId)
    const userId =
      typeof payload.id === "number"
        ? payload.id
        : typeof payload.sub === "number"
        ? payload.sub
        : typeof payload.sub === "string" && /^\d+$/.test(payload.sub)
        ? Number(payload.sub)
        : typeof payload.userId === "number"
        ? payload.userId
        : undefined;

    if (!Number.isFinite(userId)) return next();

    // Carrega utilizador + roles
    const dbUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { userRoles: { include: { role: true } } },
    });
    if (!dbUser) return next();

    req.user = toAuthUser(dbUser);

    // Acting child (header ou cookie), apenas para FAMILY
    if (req.user.isFamily) {
      const actingHeader = req.header("x-acting-child-id");
      const actingCookie = (req as any).cookies?.[ACTING_COOKIE];
      const candidate = actingHeader ?? actingCookie;
      if (candidate) {
        const childId = Number(candidate);
        if (Number.isFinite(childId)) {
          const link = await prisma.childFamily.findUnique({
            where: { childId_familyId: { childId, familyId: req.user.id } },
            select: { childId: true },
          });
          req.actingChildId = link ? childId : null;
        }
      }
    }

    next();
  } catch (e) {
    // Não bloquear requests públicos por erros no withUser
    console.warn("withUser error:", e);
    return next();
  }
}

// ------------ guards (estes SIM devolvem 401/403) ------------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return unauthorized(res);
  next();
}

export function requireRole(...allowed: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    const ok = req.user.roles.some((r) => allowed.includes(r));
    if (!ok) return forbidden(res);
    next();
  };
}

export function requireAnyRole(...allowed: RoleName[]) {
  return requireRole(...allowed);
}

export const requireFamilyOrLibrarian = requireRole(
  ROLES.FAMILY,
  ROLES.LIBRARIAN,
  ROLES.ADMIN
);

/**
 * requireSelfOrRole:
 * - Se o recurso pertencer ao req.user.id → passa
 * - Senão, precisa de um dos roles permitidos
 */
export function requireSelfOrRole(
  getOwnerId: (req: Request) => number | undefined,
  ...allowed: RoleName[]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    const ownerId = getOwnerId(req);
    if (ownerId && ownerId === req.user.id) return next();
    const ok = req.user.roles.some((r) => allowed.includes(r));
    if (!ok) return forbidden(res);
    next();
  };
}

// ------- ownership helpers -------
export function ensureLibrarianOwnsParam(param = "librarianId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    if (!req.user.isLibrarian && !req.user.isAdmin) return forbidden(res);
    const id = Number(req.params[param]);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    if (req.user.isAdmin || req.user.id === id) return next();
    return forbidden(res);
  };
}

export function ensureFamilyOwnsBodyField(field = "familyId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    if (!req.user.isFamily && !req.user.isAdmin) return forbidden(res);
    const id = Number((req.body ?? {})[field]);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid familyId" });
    if (req.user.isAdmin || req.user.id === id) return next();
    return forbidden(res);
  };
}
