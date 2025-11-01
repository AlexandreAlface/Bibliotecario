// apps/api/src/routes/librarian-families.ts
// Autor: Alexandre Brissos 21131
// O que faz: endpoints para bibliotecários consultarem famílias.
// Melhorias: extraí helpers *puros* (parse/mapeamento/where), handlers < 30 linhas,
// tipagem explícita e projeções consistentes.

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { prisma } from "../../prisma";
import { requireRole, ROLES, withUser } from "../../middlewares/auth";
import { Prisma, $Enums } from "@prisma/client";

const r = Router();

/* -------------------- Helpers PUROS -------------------- */
const toLimit = (v: unknown, def = 25, max = 50) =>
  Math.min(Number(v ?? def) || def, max);
const toCursor = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const toSearch = (v: unknown) => String(v ?? "").trim();

const toInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};



const buildFamilyWhere = (
  roleId: number,
  q: string,
  libraryId?: number
): Prisma.UserWhereInput => ({
  userRoles: { some: { roleId } },
  ...(libraryId ? { userLibraries: { some: { libraryId } } } : {}),
  ...(q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
    : {}),
});

const mapFamilyListItem = (u: {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  children: { childId: number }[];
}) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  phone: u.phone,
  childrenCount: u.children.length,
});

/* -------------------- Rotas (<30 linhas) -------------------- */

// GET /api/librarian/families?search=&limit=25&cursor=ID
r.get(
  "/families",
  withUser,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const limit = toLimit(req.query.limit, 25, 50);
      const cursor = toCursor(req.query.cursor);
      const q = toSearch(req.query.search);
      const libraryId = toInt(req.query.libraryId); // 👈 filtro por biblioteca

      const role = await prisma.role.findFirst({ where: { name: "FAMÍLIA" } });
      if (!role) return res.json({ items: [], nextCursor: null });

      const items = await prisma.user.findMany({
        where: buildFamilyWhere(role.id, q, libraryId),
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ fullName: "asc" }, { id: "asc" }], // 👈 UX melhor
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          children: { select: { childId: true } },
        },
      });

      const hasMore = items.length > limit;
      if (hasMore) items.pop();
      res.json({
        items: items.map(mapFamilyListItem),
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      });
    } catch (e) {
      next(e);
    }
  }
);

// GET /api/librarian/families/:id (detalhe completo)
r.get(
  "/families/:id",
  withUser,
  requireRole(ROLES.LIBRARIAN, ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "invalid_id" });

      const family = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          address: true,
          children: {
            select: {
              child: { select: { id: true, name: true, birthDate: true } },
            },
            orderBy: { childId: "asc" },
          },
        },
      });
      if (!family) return res.status(404).json({ error: "not_found" });

      const children = family.children.map((cf) => cf.child);
      const childIds = children.map((c) => c.id);
      const now = new Date();

      const [
        upcomingConsults,
        recentConsults,
        badges,
        readings,
        reservations,
        ratings,
      ] = await Promise.all([
        prisma.consultation.findMany({
          where: {
            familyId: id,
            status: {
              in: [
                $Enums.ConsultationStatus.PENDING,
                $Enums.ConsultationStatus.CONFIRMED,
              ],
            },
            startAt: { gte: now },
          },
          orderBy: { startAt: "asc" },
          take: 8,
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            child: { select: { id: true, name: true } },
            librarian: { select: { id: true, fullName: true } },
            library: { select: { id: true, name: true } },
          },
        }),
        prisma.consultation.findMany({
          where: {
            familyId: id,
            status: {
              in: [
                $Enums.ConsultationStatus.COMPLETED,
                $Enums.ConsultationStatus.CANCELLED,
                $Enums.ConsultationStatus.DECLINED,
              ],
            },
          },
          orderBy: [{ startAt: "desc" }, { requestedAt: "desc" }],
          take: 12,
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            requestedAt: true,
            child: { select: { id: true, name: true } },
            librarian: { select: { id: true, fullName: true } },
            library: { select: { id: true, name: true } },
          },
        }),
        prisma.badgeAssignment.findMany({
          where: { childId: { in: childIds } },
          orderBy: { assignedAt: "desc" },
          take: 40,
          select: {
            assignedAt: true,
            childId: true,
            badge: { select: { id: true, name: true, type: true } },
          },
        }),
        prisma.reading.findMany({
          where: { childId: { in: childIds }, finishedAt: null },
          orderBy: { startedAt: "desc" },
          take: 20,
          select: {
            id: true,
            childId: true,
            startedAt: true,
            book: {
              select: { isbn: true, title: true, author: true, coverUrl: true },
            },
          },
        }),
        prisma.bookReservation.findMany({
          where: { childId: { in: childIds } },
          orderBy: { reservedAt: "desc" },
          take: 20,
          select: {
            id: true,
            childId: true,
            reservedAt: true,
            book: {
              select: { isbn: true, title: true, author: true, coverUrl: true },
            },
          },
        }),
        prisma.rating.findMany({
          where: { userId: id },
          orderBy: { ratedAt: "desc" },
          take: 20,
          select: {
            id: true,
            stars: true,
            comment: true,
            ratedAt: true,
            childId: true,
            book: {
              select: { isbn: true, title: true, author: true, coverUrl: true },
            },
          },
        }),
      ]);

      res.json({
        family: {
          id: family.id,
          fullName: family.fullName,
          email: family.email,
          phone: family.phone,
          address: family.address,
        },
        children,
        badges,
        readings,
        reservations,
        ratings,
        upcomingConsultations: upcomingConsults,
        recentConsultations: recentConsults,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default r;
