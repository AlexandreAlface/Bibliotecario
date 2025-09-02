// apps/api/src/middlewares/auth.ts
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- Roles canónicos do teu sistema ---
export const ROLES = {
  FAMILY: 'FAMÍLIA',
  LIBRARIAN: 'BIBLIOTECÁRIO',
  CHILD: 'CRIANÇA',
  ADMIN: 'ADMIN',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// Payload mínimo esperado no JWT
type JwtPayloadMinimal = {
  sub?: string | number
  id?: number
  email?: string
  // podes ter mais campos aqui (p.ex. roles)
}

// O que vamos colocar em req.user
export type AuthUser = {
  id: number
  fullName: string
  email: string
  roles: RoleName[]
  isFamily: boolean
  isLibrarian: boolean
  isChild: boolean
  isAdmin: boolean
}

// Augment Express types
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      actingChildId?: number | null
    }
  }
}

// ------------- utils -------------
function toAuthUser(u: any): AuthUser {
  const roleNames = (u.userRoles ?? [])
    .map((ur: any) => ur?.role?.name)
    .filter(Boolean)

  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    roles: roleNames,
    isFamily: roleNames.includes(ROLES.FAMILY),
    isLibrarian: roleNames.includes(ROLES.LIBRARIAN),
    isChild: roleNames.includes(ROLES.CHILD),
    isAdmin: roleNames.includes(ROLES.ADMIN),
  }
}

function unauthorized(res: Response, msg = 'unauthenticated') {
  return res.status(401).json({ error: msg })
}

function forbidden(res: Response, msg = 'forbidden') {
  return res.status(403).json({ error: msg })
}

// ------------- middleware principal -------------
/**
 * withUser
 * - Verifica Bearer token
 * - Carrega utilizador + roles
 * - Lê header opcional x-acting-child-id (apenas válido para família)
 */
export async function withUser(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.header('authorization') || req.header('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) return unauthorized(res)

    const token = auth.slice('Bearer '.length).trim()
    const secret = process.env.JWT_SECRET
    if (!secret) return unauthorized(res, 'server misconfigured (JWT_SECRET)')

    let payload: JwtPayloadMinimal
    try {
      payload = jwt.verify(token, secret) as JwtPayloadMinimal
    } catch {
      return unauthorized(res, 'invalid token')
    }

    const userId =
      typeof payload.id === 'number'
        ? payload.id
        : typeof payload.sub === 'string'
        ? Number(payload.sub)
        : undefined

    if (!userId || !Number.isFinite(userId)) return unauthorized(res, 'invalid subject')

    // Carrega utilizador + roles
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    })
    if (!dbUser) return unauthorized(res, 'user not found')

    req.user = toAuthUser(dbUser)

    // acting child (opcional) — só faz sentido para FAMÍLIA
    const actingHeader = req.header('x-acting-child-id')
    if (actingHeader && req.user.isFamily) {
      const childId = Number(actingHeader)
      if (Number.isFinite(childId)) {
        // valida que pertence à família
        const link = await prisma.childFamily.findUnique({
          where: { childId_familyId: { childId, familyId: req.user.id } },
          select: { childId: true },
        })
        req.actingChildId = link ? childId : null
      } else {
        req.actingChildId = null
      }
    } else {
      req.actingChildId = null
    }

    next()
  } catch (e) {
    console.error('withUser error', e)
    return unauthorized(res)
  }
}

// ------------- guards -------------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return unauthorized(res)
  next()
}

export function requireRole(...allowed: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res)
    const ok = req.user.roles.some((r) => allowed.includes(r))
    if (!ok) return forbidden(res)
    next()
  }
}

export function requireAnyRole(...allowed: RoleName[]) {
  return requireRole(...allowed)
}

// usado no desenho das rotas acima
export const requireFamilyOrLibrarian = requireRole(ROLES.FAMILY, ROLES.LIBRARIAN, ROLES.ADMIN);


/**
 * requireSelfOrRole:
 * - Se o recurso tem um ownerId numérico (p.ex. familyId/librarianId) igual ao req.user.id -> passa
 * - Caso contrário, precisa de ter um dos roles permitidos
 */
export function requireSelfOrRole(
  getOwnerId: (req: Request) => number | undefined,
  ...allowed: RoleName[]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res)
    const ownerId = getOwnerId(req)
    if (ownerId && ownerId === req.user.id) return next()
    const ok = req.user.roles.some((r) => allowed.includes(r))
    if (!ok) return forbidden(res)
    next()
  }
}

// ------------- ownership helpers (exemplos) -------------
export function ensureLibrarianOwnsParam(param = 'librarianId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res)
    if (!req.user.isLibrarian && !req.user.isAdmin) return forbidden(res)
    const id = Number(req.params[param])
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' })
    if (req.user.isAdmin || req.user.id === id) return next()
    return forbidden(res)
  }
}

export function ensureFamilyOwnsBodyField(field = 'familyId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res)
    if (!req.user.isFamily && !req.user.isAdmin) return forbidden(res)
    const id = Number((req.body ?? {})[field])
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid familyId' })
    if (req.user.isAdmin || req.user.id === id) return next()
    return forbidden(res)
  }
}

