// src/routes/auth.ts
// Autor: Alexandre Brissos 21131
// O que faz: registo, login, sessão atual (/me) e logout.
// Inclui middleware de autenticação e helpers “puros” (curtos) para
// cookies e JWT.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type CookieOptions,
  type RequestHandler,
} from "express";
import { prisma } from "../../prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const COOKIE_NAME = process.env.COOKIE_NAME || "bf_access";
const ACTING_COOKIE = process.env.ACTING_COOKIE || "bf_acting";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const isProd = process.env.NODE_ENV === "production";

type AuthUser = { sub: number; roles: string[] };

/* ---------- Helpers puros ---------- */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
    domain: COOKIE_DOMAIN,
  };
}
export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, authCookieOptions());
}
export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/", domain: COOKIE_DOMAIN });
}
export function signToken(payload: AuthUser): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
function verifyToken(token: string): (jwt.JwtPayload & Partial<AuthUser>) | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const p = jwt.verify(token, secret);
    return typeof p === "string" ? null : (p as jwt.JwtPayload & Partial<AuthUser>);
  } catch {
    return null;
  }
}
function extractUserId(p?: jwt.JwtPayload | null): number | undefined {
  if (!p) return;
  const sub = (p as any).sub ?? (p as any).id ?? (p as any).userId;
  if (typeof sub === "number") return sub;
  if (typeof sub === "string" && /^\d+$/.test(sub)) return Number(sub);
}

/* ---------- Middleware auth ---------- */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = (req as any).cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Sessão inválida" });
  (req as any).user = payload;
  next();
};

/* ---------- Rotas ---------- */

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fullName,
      email,
      phone,
      citizenCard,
      address,
      postalCode,
      password,
      libraryId,
      children = [],
    } = (req.body || {}) as any;

    if (!fullName || !email || !password)
      return res.status(400).json({ error: "Campos obrigatórios em falta" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "E-mail já registado" });

    const passwordHash = await bcrypt.hash(String(password), 12);
    const role = await prisma.role.upsert({
      where: { name: "FAMÍLIA" },
      update: {},
      create: { name: "FAMÍLIA" },
    });

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        citizenCard,
        address,
        postalCode,
        passwordHash,
        userRoles: { create: { roleId: role.id } },
        ...(libraryId
          ? { userLibraries: { create: { libraryId: Number(libraryId) } } }
          : {}),
        children: {
          create: (children as any[]).map((c) => ({
            child: {
              create: {
                name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim(),
                birthDate: c.birthDate
                  ? new Date(c.birthDate)
                  : new Date(new Date().getFullYear() - Number(c.age || 0), 0, 1),
                gender: c.gender || null,
                readerProfile: c.readerProfile || null,
              },
            },
          })),
        },
      },
      select: { id: true, fullName: true, email: true },
    });

    return res.status(201).json({ userId: user.id, emailVerification: "pending" });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: "Credenciais em falta" });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const token = signToken({ sub: user.id, roles });

    setAuthCookie(res, token);
    res.clearCookie(ACTING_COOKIE, { path: "/", domain: COOKIE_DOMAIN });

    return res.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, roles },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).cookies?.[COOKIE_NAME];
    const actingCookie = (req as any).cookies?.[ACTING_COOKIE];
    const payload = token ? verifyToken(token) : null;
    const userId = extractUserId(payload);
    if (!Number.isFinite(userId)) return res.json(null);

    const u = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        citizenCard: true,
        address: true,
        postalCode: true,
        userRoles: { include: { role: true } },
        children: {
          include: {
            child: {
              select: {
                id: true,
                name: true,
                birthDate: true,
                gender: true,
                readerProfile: true,
              },
            },
          },
        },
      },
    });
    if (!u) return res.json(null);

    const roles = u.userRoles.map((ur) => ur.role.name);
    const children = u.children.map((c) => ({
      id: c.childId,
      name: c.child.name,
      birthDate: c.child.birthDate,
      gender: c.child.gender,
      readerProfile: c.child.readerProfile,
      avatarUrl: null as any,
    }));

    const actingId = Number(actingCookie || 0);
    if (actingId) {
      const child = children.find((c) => c.id === actingId) || null;
      if (child) {
        const rolesWithChild = Array.from(new Set([...roles, "CRIANÇA"]));
        return res.json({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          roles: rolesWithChild,
          actingChild: child,
          children,
          phone: u.phone,
          citizenCard: u.citizenCard,
          address: u.address,
          postalCode: u.postalCode,
        });
      }
    }

    return res.json({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      roles,
      actingChild: null,
      children,
      phone: u.phone,
      citizenCard: u.citizenCard,
      address: u.address,
      postalCode: u.postalCode,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.clearCookie(ACTING_COOKIE, { path: "/", domain: COOKIE_DOMAIN });
  res.status(204).end();
});

export default router;
