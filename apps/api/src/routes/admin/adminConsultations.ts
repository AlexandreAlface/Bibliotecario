/**
 * Admin — listagem de consultas por biblioteca.
 * Autor: Alexandre Brissos
 * Data: 2025-10-02
 * Nota: Mantidas as rotas; extraídos helpers puros para validar/parsing e
 *       composição de filtros Prisma. Handlers ≤ 30 linhas.
 */

import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma";
import { requireRole, ROLES } from "../../middlewares/auth";
import { ConsultationStatus, type Prisma } from "@prisma/client";

const r = Router();

/* ========================= Helpers puros =========================
 * — Alexandre Brissos — 2025-10-02
 */

/** Converte e valida ID positivo. — Alexandre Brissos — 2025-10-02 */
function parsePositiveId(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`invalid_${field}`);
  return n;
}

/** Normaliza a query "status" para enum[] do Prisma. — Alexandre Brissos — 2025-10-02 */
function parseStatuses(statusStr?: string): ConsultationStatus[] | undefined {
  if (!statusStr) return undefined;
  const allowed = new Set(Object.values(ConsultationStatus));
  const parsed = statusStr
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is ConsultationStatus => allowed.has(s as ConsultationStatus));
  return parsed.length ? parsed : undefined;
}

/** Extrai librarianId opcional. — Alexandre Brissos — 2025-10-02 */
function parseOptionalNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Constrói where para consultas de uma biblioteca (por libraryId
 * ou pertença do bibliotecário à biblioteca). — Alexandre Brissos — 2025-10-02
 */
function buildWhere(
  libraryId: number,
  statuses?: ConsultationStatus[],
  librarianId?: number,
  q?: string
): Prisma.ConsultationWhereInput {
  const AND: Prisma.ConsultationWhereInput[] = [
    {
      OR: [
        { libraryId },
        { librarian: { userLibraries: { some: { libraryId } } } },
      ],
    },
  ];
  if (statuses?.length) AND.push({ status: { in: statuses } });
  if (librarianId) AND.push({ librarianId });
  if (q) {
    AND.push({ OR: [
      { child: { name: { contains: q, mode: "insensitive" } } },
      { family: { fullName: { contains: q, mode: "insensitive" } } },
    ]});
  }
  return { AND };
}

/** Mapeia entidade → DTO para resposta JSON. — Alexandre Brissos — 2025-10-02 */
function toDto(i: {
  id: number; startAt: Date | null; endAt: Date | null; status: ConsultationStatus;
  libraryId: number | null;
  child: { id: number; name: string } | null;
  family: { id: number; fullName: string } | null;
  librarian: { id: number; fullName: string; email: string } | null;
}) {
  return {
    id: i.id,
    startAt: i.startAt ? i.startAt.toISOString() : null,
    endAt: i.endAt ? i.endAt.toISOString() : null,
    status: i.status,
    libraryId: i.libraryId ?? null,
    child: i.child ? { id: i.child.id, name: i.child.name } : null,
    family: i.family ? { id: i.family.id, fullName: i.family.fullName } : null,
    librarian: i.librarian ? { id: i.librarian.id, fullName: i.librarian.fullName, email: i.librarian.email } : null,
  };
}

/* ========================= Rota (inalterada) =========================
 * — Alexandre Brissos — 2025-10-02
 */

/**
 * GET /admin/libraries/:libraryId/consultations — lista até 500 consultas.
 * Query: status (CSV), librarianId, q (texto)
 * — Alexandre Brissos — 2025-10-02
 */
r.get(
  "/admin/libraries/:libraryId/consultations",
  requireRole(ROLES.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const libraryId = parsePositiveId(req.params.libraryId, "libraryId");
      const q = (req.query.q as string | undefined)?.trim() || undefined;
      const statuses = parseStatuses((req.query.status as string | undefined)?.trim());
      const librarianId = parseOptionalNumber(req.query.librarianId);

      const where = buildWhere(libraryId, statuses, librarianId, q);
      const items = await prisma.consultation.findMany({
        where,
        orderBy: [{ startAt: "desc" }, { id: "desc" }],
        take: 500,
        select: {
          id: true, startAt: true, endAt: true, status: true, libraryId: true,
          child: { select: { id: true, name: true } },
          family: { select: { id: true, fullName: true } },
          librarian: { select: { id: true, fullName: true, email: true } },
        },
      });
      return res.json(items.map(toDto));
    } catch (e: any) {
      if (String(e?.message || "").includes("invalid_libraryId"))
        return res.status(400).json({ error: "libraryId inválido" });
      return next(e);
    }
  }
);

export default r;
