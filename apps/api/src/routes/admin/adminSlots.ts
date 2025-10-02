// apps/api/src/routes/adminSlots.ts
// Autor: Alexandre Brissos 21131

import { Router } from "express";
import { prisma } from "../../prisma";
import { requireRole, ROLES } from "../../middlewares/auth";

const r = Router();

/** Valida e devolve um ID de biblioteca (>0); lança 400 se inválido. */
function parseLibraryId(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    const err: any = new Error("libraryId inválido");
    err.status = 400;
    throw err;
  }
  return n;
}

/** Constrói intervalo [from,to] com defaults: hoje 00:00 → +30d 23:59:59.999. */
function parseDateRange(fromQ?: any, toQ?: any) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  end.setHours(23, 59, 59, 999);

  const from = fromQ ? new Date(String(fromQ)) : start;
  const to = toQ ? new Date(String(toQ)) : end;

  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    const err: any = new Error("intervalo de datas inválido");
    err.status = 400;
    throw err;
  }
  return { from, to };
}

/** Valida lista de estados (OPEN,BOOKED,BLOCKED); devolve undefined se vazio. */
function parseStatuses(s?: string) {
  if (!s) return undefined;
  const ALLOWED = new Set(["OPEN", "BOOKED", "BLOCKED"]);
  const list = s
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  if (!list.every((x) => ALLOWED.has(x))) {
    const err: any = new Error("status inválido");
    err.status = 400;
    throw err;
  }
  return list.length ? list : undefined;
}

/** Constrói filtro Prisma garantindo pertença à biblioteca e intervalo. */
function buildSlotWhere(
  libraryId: number,
  from: Date,
  to: Date,
  statuses?: string[],
  librarianId?: number
) {
  const AND: any[] = [
    {
      OR: [
        { libraryId },
        { librarian: { userLibraries: { some: { libraryId } } } },
      ],
    },
    { startAt: { gte: from }, endAt: { lte: to } },
  ];
  if (statuses?.length) AND.push({ status: { in: statuses } });
  if (Number.isFinite(librarianId as number)) AND.push({ librarianId });
  return { AND } as any;
}

/** Mapeia slot para DTO limpo para o frontend. */
function mapSlotDto(s: {
  id: number;
  startAt: Date;
  endAt: Date;
  status: string;
  librarian: { id: number; fullName: string; email: string };
  consultation?: { id: number } | null;
}) {
  return {
    id: s.id,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    status: s.status,
    librarian: {
      id: s.librarian.id,
      fullName: s.librarian.fullName,
      email: s.librarian.email,
    },
    consultationId: s.consultation?.id ?? null,
  };
}

/** Verifica se mudança é permitida (apenas OPEN ↔ BLOCKED). */
function assertToggleAllowed(current: string, next: string) {
  if (!["OPEN", "BLOCKED"].includes(next)) {
    const err: any = new Error("status inválido (apenas OPEN ou BLOCKED)");
    err.status = 400;
    throw err;
  }
  if (current === "BOOKED") {
    const err: any = new Error("slot reservado — não pode ser alterado");
    err.status = 409;
    throw err;
  }
}

/** Confirma pertença do slot à biblioteca (por libraryId direto ou via bibliotecário). */
function belongsToLibrary(
  slot: {
    libraryId: number | null;
    librarian: { userLibraries: { libraryId: number }[] };
  },
  libraryId: number
) {
  return (
    slot.libraryId === libraryId ||
    slot.librarian.userLibraries.some((ul) => ul.libraryId === libraryId)
  );
}

/** Se for abrir (OPEN), impede caso exista LibraryBlock sobreposto. */
async function assertNoGlobalBlockOnOpen(
  nextStatus: string,
  slot: {
    startAt: Date;
    endAt: Date;
    libraryId: number | null;
    librarian: { userLibraries: { libraryId: number }[] };
  },
  libraryIdContext: number
) {
  if (nextStatus !== "OPEN") return;
  const effLibId =
    slot.libraryId ??
    slot.librarian.userLibraries.find((ul) => ul.libraryId === libraryIdContext)
      ?.libraryId ??
    null;
  if (!effLibId) return;
  const hasBlock = await prisma.libraryBlock.findFirst({
    where: {
      libraryId: effLibId,
      startAt: { lt: slot.endAt },
      endAt: { gt: slot.startAt },
    },
    select: { id: true },
  });
  if (hasBlock) {
    const err: any = new Error("global_block_overlap");
    err.status = 409;
    throw err;
  }
}

/* =========================
   GET /admin/libraries/:libraryId/slots
   ========================= */
r.get(
  "/admin/libraries/:libraryId/slots",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const { from, to } = parseDateRange(req.query.from, req.query.to);
      const statuses = parseStatuses((req.query.status as string) || "");
      const librarianId = req.query.librarianId
        ? Number(req.query.librarianId)
        : undefined;

      const where = buildSlotWhere(libraryId, from, to, statuses, librarianId);
      const slots = await prisma.consultationSlot.findMany({
        where,
        orderBy: [{ startAt: "asc" }],
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          librarian: { select: { id: true, fullName: true, email: true } },
          consultation: { select: { id: true } },
        },
        take: 1000,
      });

      res.json(slots.map(mapSlotDto));
    } catch (e) {
      next(e);
    }
  }
);

/* =========================
   PATCH /admin/libraries/:libraryId/slots/:slotId
   ========================= */
r.patch(
  "/admin/libraries/:libraryId/slots/:slotId",
  requireRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const libraryId = parseLibraryId(req.params.libraryId);
      const slotId = Number(req.params.slotId);
      const nextStatus = String(req.body?.status || "").toUpperCase();

      const slot = await prisma.consultationSlot.findUnique({
        where: { id: slotId },
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          libraryId: true,
          consultation: { select: { id: true } },
          librarian: {
            select: { userLibraries: { select: { libraryId: true } } },
          },
        },
      });
      if (!slot) return res.status(404).json({ error: "slot não encontrado" });
      if (!belongsToLibrary(slot, libraryId))
        return res.status(403).json({ error: "forbidden" });

      assertToggleAllowed(slot.status, nextStatus);
      if (slot.consultation?.id)
        return res
          .status(409)
          .json({ error: "slot reservado — não pode ser alterado" });

      await assertNoGlobalBlockOnOpen(nextStatus, slot, libraryId);

      if (slot.status === nextStatus)
        return res.json({
          ok: true,
          unchanged: true,
          id: slot.id,
          status: slot.status,
        });

      const updated = await prisma.consultationSlot.update({
        where: { id: slot.id },
        data: { status: nextStatus as any },
        select: { id: true, status: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

export default r;
