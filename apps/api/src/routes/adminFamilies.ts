import { Router } from "express";
import { prisma } from "../prisma";
import { ROLES, requireRole } from "../middlewares/auth";

export const r = Router();

/**
 * Listar famílias de uma biblioteca (com filhos e filtros)
 * GET /admin/libraries/:libraryId/families
 *
 * Query:
 *  - q: string (fullName/email/phone/address)
 *  - child: string (nome do filho)
 *  - gender: string (género do filho)
 *  - ageMin: number (anos)
 *  - ageMax: number (anos)
 *  - hasChildren: "true" | "false"
 *  - limit: 1..100 (default 25)
 *  - cursor: id para paginação ascendente
 *
 * Resposta:
 * {
 *   items: Array<{
 *     id: number; fullName: string; email: string;
 *     phone?: string|null; address?: string|null;
 *     childrenCount: number;
 *     children: Array<{
 *       id: number; name: string; birthDate: string; gender?: string|null;
 *       ageYears: number; readingsCount: number; ratingsCount: number;
 *     }>;
 *   }>;
 *   nextCursor: number|null;
 * }
 */
r.get(
  "/admin/libraries/:libraryId/families",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  async (req, res) => {
    const libraryId = Number(req.params.libraryId);
    if (!Number.isFinite(libraryId) || libraryId <= 0) {
      return res.status(400).json({ error: "invalid_library_id" });
    }

    // Se não for admin, tem de pertencer à biblioteca
    const me = (req as any).user as { id: number; roles: string[] } | undefined;
    const isAdmin = (me?.roles || []).some(
      (r) => r.toUpperCase() === ROLES.ADMIN
    );
    if (!isAdmin) {
      const hasAccess = await prisma.userLibrary.findUnique({
        where: { userId_libraryId: { userId: me!.id, libraryId } },
        select: { userId: true },
      });
      if (!hasAccess) return res.status(403).json({ error: "forbidden" });
    }

    // ---- Query params ----
    const q = String(req.query.q ?? "").trim();
    const childName = String(req.query.child ?? "").trim();
    const gender = String(req.query.gender ?? "").trim();
    const ageMin =
      req.query.ageMin != null ? Number(req.query.ageMin) : undefined;
    const ageMax =
      req.query.ageMax != null ? Number(req.query.ageMax) : undefined;
    const hasChildrenParam = String(req.query.hasChildren ?? "").toLowerCase();
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? 25), 10) || 25, 1),
      100
    );
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;

    // Validação simples
    if (Number.isNaN(ageMin as any) || Number.isNaN(ageMax as any)) {
      return res.status(400).json({ error: "invalid_age_filter" });
    }

    // Helpers para calcular janela de nascimento a partir de idade em anos
    function yearsAgo(n: number) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - n);
      return d;
    }
    let birthFrom: Date | undefined; // data >= birthFrom (mais novo / idade menor)
    let birthTo: Date | undefined; // data <= birthTo (mais velho / idade maior)
    if (typeof ageMin === "number") {
      // Pelo menos ageMin anos => nasceu há >= ageMin -> birthDate <= hoje - ageMin
      birthTo = yearsAgo(ageMin);
    }
    if (typeof ageMax === "number") {
      // No máximo ageMax anos => nasceu há <= ageMax -> birthDate >= hoje - ageMax
      birthFrom = yearsAgo(ageMax);
    }

    // Aceitar aliases do role "família"
    const FAMILY_ALIASES = ["FAMILY", "FAMÍLIA", "FAMILIA"];

    // Filtro por filhos (criado dinamicamente)
    const childWhere: any = {};
    if (childName)
      childWhere.name = { contains: childName, mode: "insensitive" };
    if (gender) childWhere.gender = { contains: gender, mode: "insensitive" };
    if (birthFrom || birthTo) {
      childWhere.birthDate = {
        ...(birthFrom ? { gte: birthFrom } : {}),
        ...(birthTo ? { lte: birthTo } : {}),
      };
    }

    // Filtro principal de utilizadores (famílias) com acesso à biblioteca
    const whereBase: any = {
      userLibraries: { some: { libraryId } },
      userRoles: { some: { role: { name: { in: FAMILY_ALIASES } } } },
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
    };

    // `hasChildren` + filtros de filho
    const hasChildrenTrue = hasChildrenParam === "true";
    const hasChildrenFalse = hasChildrenParam === "false";

    if (Object.keys(childWhere).length > 0) {
      // quando há filtros de filho, obriga a pelo menos um filho que case
      whereBase.children = { some: { child: childWhere } };
    } else if (hasChildrenTrue) {
      whereBase.children = { some: {} };
    } else if (hasChildrenFalse) {
      whereBase.children = { none: {} };
    }

    // Query
    const rows = await prisma.user.findMany({
      where: whereBase,
      orderBy: { id: "asc" },
      take: limit + 1,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        children: {
          // ChildFamily[]
          select: {
            child: {
              select: {
                id: true,
                name: true,
                birthDate: true,
                gender: true,
                _count: {
                  select: {
                    readings: true,
                    ratings: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { children: true } },
      },
    });

    const items = rows.slice(0, limit).map((u) => {
      const children = (u.children || []).map((cf) => {
        const c = cf.child as {
          id: number;
          name: string | null;
          birthDate: Date;
          gender: string | null;
          _count: { readings: number; ratings: number };
        };
        // idade em anos (inteiro)
        const today = new Date();
        let age = today.getFullYear() - c.birthDate.getFullYear();
        const m = today.getMonth() - c.birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < c.birthDate.getDate()))
          age--;

        return {
          id: c.id,
          name: c.name,
          birthDate: c.birthDate.toISOString(),
          gender: c.gender,
          ageYears: age,
          readingsCount: c._count.readings,
          ratingsCount: c._count.ratings,
        };
      });

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone ?? null,
        address: u.address ?? null,
        childrenCount: u._count.children,
        children,
      };
    });

    const nextCursor = rows.length > limit ? rows[limit].id : null;
    return res.json({ items, nextCursor });
  }
);

export default r;
