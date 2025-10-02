// apps/api/src/routes/adminLibrarians.list.ts
/**
 * Admin — listar bibliotecários de uma biblioteca.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 */

import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { requireRole, ROLES } from "../../middlewares/auth";

const r = Router();

/* ========================= Helpers =========================
 * — Alexandre Brissos — 2025-10-02
 */

/** Lê e valida um ID positivo. */
function parsePositiveId(v: any, field = "id"): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    const err: any = new Error(`${field}_inválido`);
    err.status = 400;
    throw err;
  }
  return n;
}

/** Determina se o utilizador é ADMIN. */
function isAdmin(me?: { roles?: string[] }) {
  return Boolean(me?.roles?.some((r) => r?.toUpperCase() === ROLES.ADMIN));
}

/** Verifica se o utilizador (não-admin) pertence à biblioteca. */
async function assertLibraryAccess(
  me: { id: number; roles: string[] } | undefined,
  libraryId: number
) {
  if (isAdmin(me)) return;
  if (!me?.id) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
  const link = await prisma.userLibrary.findUnique({
    where: { userId_libraryId: { userId: me.id, libraryId } },
    select: { userId: true },
  });
  if (!link) {
    const err: any = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

/* ========================= Rota =========================
 * GET /admin/libraries/:libraryId/librarians
 * Query:
 *  - q?: string  (filtra por fullName/email)
 *
 * Resposta: [{ id, fullName, email }]
 * — mantém forma para compat com o FE atual.
 */
r.get(
  "/admin/libraries/:libraryId/librarians",
  requireRole(ROLES.ADMIN, ROLES.LIBRARIAN),
  async (req: Request, res: Response, next) => {
    try {
      const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
      const me = (req as any).user as
        | { id: number; roles: string[] }
        | undefined;

      // Librarians só podem ver as suas bibliotecas; admins podem ver todas
      await assertLibraryAccess(me, libraryId);

      const q = String(req.query.q ?? "").trim();

      const LIBRARIAN_ALIASES = [
        ROLES.LIBRARIAN,
        "BIBLIOTECÁRIO",
        "BIBLIOTECARIO",
      ];

      const where: any = {
        userLibraries: { some: { libraryId } },
        userRoles: { some: { role: { name: { in: LIBRARIAN_ALIASES } } } },
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const items = await prisma.user.findMany({
        where,
        select: { id: true, fullName: true, email: true },
        orderBy: [{ fullName: "asc" }, { id: "asc" }],
      });

      res.json(items);
    } catch (e: any) {
      return res
        .status(e?.status || 500)
        .json({ error: e?.message || "internal_error" });
    }
  }
);

export default r;
