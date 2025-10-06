/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de Consultas (listar próximas, histórico, slots e propostas).
 *            Usa cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { http } from "./https";

/* ------------------------- Tipos ------------------------- */

export type ConsultaLite = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  scheduledAt?: string;
  status?: string;
  familyId?: number;
  librarianId?: number | null;
  librarianName?: string;
  childId?: number;
  libraryId?: number;
  libraryName?: string;
};

export type ConsultationFull = {
  id: number;
  title?: string;
  status: string;
  requestedAt?: string;
  startAt?: string | null;
  endAt?: string | null;
  family?: { id: number; fullName: string; email?: string };
  librarian?: { id: number; fullName: string; email?: string };
  child?: { id: number; name: string };
  library?: { id: number; name: string };
  slot?: { id: number; startAt: string; endAt: string; status: string } | null;
  events?: { id: number; type: string; at: string; actorId?: number | null }[];
};

export type SlotLite = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED";
  librarianId: number;
  librarianName?: string;
  librarianAvatarUrl?: string | null;
  libraryId?: number;
  libraryName?: string;
};

/* ----------------------- Helpers ------------------------ */

const validId = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Limpa params (remove undefined/""). Mantém null/0/false. */
function paramsOf(p: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p))
    if (v !== undefined && v !== "") o[k] = v;
  return o;
}

/** Normaliza lista de consultas e ordena por scheduledAt asc. */
function normalizeConsultas(arr: any[], limit?: number): ConsultaLite[] {
  const list = (Array.isArray(arr) ? arr : [])
    .map((c: any) => ({
      id: Number(c?.id),
      title:
        c?.title ||
        `Consulta de ${c?.child?.name ?? "criança"}${
          c?.library?.name ? ` — ${c.library.name}` : ""
        }`,
      date: c?.startAt ?? c?.date ?? c?.scheduledAt ?? null,
      scheduledAt: c?.scheduledAt ?? c?.startAt ?? c?.date ?? null,
      status: c?.status,
      familyId: c?.familyId ?? c?.family?.id,
      childId: c?.childId ?? c?.child?.id,
      librarianId: c?.librarianId ?? c?.librarian?.id ?? null,
      librarianName: c?.librarianName ?? c?.librarian?.fullName ?? undefined,
      libraryId: c?.libraryId ?? c?.library?.id,
      libraryName: c?.libraryName ?? c?.library?.name,
    }))
    .filter((c) => !!c.scheduledAt)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime()
    );
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/* ------------------ Próximas consultas ------------------ */

/**
 * Devolve próximas consultas (tenta /consultations/next; fallback para /all).
 * Filtra para estados úteis (PENDING|CONFIRMED). Ordenado por data asc.
 */
export async function getNextConsultas(
  limit = 6,
  opts?: { familyId?: number; childId?: number; librarianId?: number }
): Promise<ConsultaLite[]> {
  // ✅ só considera IDs > 0 e aceita childId também
  const fid = validId(opts?.familyId);
  const cid = validId(opts?.childId);
  const lid = validId(opts?.librarianId);

  const hasKey = !!(fid || cid || lid);
  if (!hasKey) return [];

  const baseParams = paramsOf({
    limit,
    familyId: fid,
    childId: cid,
    librarianId: lid,
  });

  // 1) tenta /next e normaliza
  try {
    const items = await http<any[]>({
      url: "/consultations/next",
      method: "GET",
      params: baseParams,
    });
    if (Array.isArray(items)) return normalizeConsultas(items, limit);
  } catch {
    // continua para fallback
  }

  // 2) fallback /all desde início do mês
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const full = await http<any[]>({
    url: "/consultations/all",
    method: "GET",
    params: paramsOf({
      ...baseParams,
      limit: Math.max(100, limit),
      from: monthStart.toISOString(),
      order: "asc",
    }),
  });

  const useful = new Set(["PENDING", "CONFIRMED"]);
  return normalizeConsultas(full, limit).filter((c) =>
    useful.has(String(c.status || "").toUpperCase())
  );
}

/** Lê uma consulta por ID (forma completa). */
export async function getConsultation(consultationId: number) {
  return http<ConsultationFull>({
    url: `/consultations/${consultationId}`,
    method: "GET",
  });
}

/* ---------------------- Slots abertos --------------------- */

/** Lista slots abertos no intervalo [from,to] com filtros opcionais. */
export async function listOpenSlots(params: {
  from: string; // ISO
  to: string; // ISO
  libraryId?: number;
  librarianId?: number;
}): Promise<SlotLite[]> {
  const data = await http<any[]>({
    url: "/consultations/slots",
    method: "GET",
    params,
  });

  if (
    Array.isArray(data) &&
    data.length &&
    "startAt" in data[0] &&
    "endAt" in data[0]
  ) {
    return data as SlotLite[];
  }

  return (Array.isArray(data) ? data : []).map(
    (s: any): SlotLite => ({
      id: Number(s?.id),
      startAt: String(s?.startAt),
      endAt: String(s?.endAt),
      status:
        (s?.status || "OPEN").toUpperCase() === "BOOKED" ? "BOOKED" : "OPEN",
      librarianId: Number(s?.librarianId ?? s?.librarian?.id),
      librarianName: s?.librarianName ?? s?.librarian?.fullName,
      librarianAvatarUrl:
        s?.librarianAvatarUrl ?? s?.librarian?.avatarUrl ?? null,
      libraryId: s?.libraryId ?? s?.library?.id,
      libraryName: s?.libraryName ?? s?.library?.name,
    })
  );
}

/** Cria consulta para um slot. */
export async function createConsultationWithSlot(payload: {
  familyId: number;
  librarianId: number;
  childId?: number;
  libraryId?: number;
  slotId: number;
  notes?: string;
}): Promise<ConsultaLite> {
  return http<ConsultaLite>({
    url: "/consultations",
    method: "POST",
    data: payload,
  });
}

/* ----------------- Propostas & conflitos ----------------- */

export async function listLibrarianProposals(
  librarianId: number,
  { page = 1, limit = 20, status = "PENDING" } = {}
) {
  return http<any>({
    url: `/consultations/librarians/${librarianId}/proposals`,
    method: "GET",
    params: { status, page, limit },
  });
}

export async function checkLibrarianConflict(
  librarianId: number,
  {
    startAt,
    endAt,
    excludeConsultationId,
  }: {
    startAt: string | Date;
    endAt: string | Date;
    excludeConsultationId?: number;
  }
) {
  const s = typeof startAt === "string" ? startAt : startAt.toISOString();
  const e = typeof endAt === "string" ? endAt : endAt.toISOString();
  return http<any>({
    url: `/consultations/librarians/${librarianId}/conflicts`,
    method: "GET",
    params: paramsOf({ startAt: s, endAt: e, excludeConsultationId }),
  });
}

export async function listPendingConsultationsForLibrarian(
  librarianId: number,
  { limit = 100, from }: { limit?: number; from?: string } = {}
) {
  return http<any[]>({
    url: "/consultations/all",
    method: "GET",
    params: paramsOf({
      limit,
      order: "asc",
      status: "PENDING",
      librarianId,
      from: from ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    }),
  });
}

/* ------------------------ Histórico ----------------------- */

/**
 * Histórico de consultas com filtros (status[] vira CSV).
 * Mapeia levemente para o formato esperado na UI.
 */
export async function getConsultationsHistory(params: {
  limit?: number;
  order?: "asc" | "desc";
  from?: string; // ISO
  to?: string; // ISO
  status?: string[]; // ConsultationStatus[]
  familyId?: number;
  librarianId?: number;
  childId?: number;
}): Promise<ConsultationFull[]> {
  const q = paramsOf({
    limit: params.limit,
    order: params.order,
    from: params.from,
    to: params.to,
    status: params.status?.length ? params.status.join(",") : undefined,
    familyId: params.familyId,
    librarianId: params.librarianId,
    childId: params.childId,
  });

  const raw = await http<any[]>({
    url: "/consultations/all",
    method: "GET",
    params: q,
  });

  return (Array.isArray(raw) ? raw : []).map(
    (c: any): ConsultationFull => ({
      id: c?.id,
      title: c?.child?.name
        ? `Consulta de ${c.child.name}`
        : c?.librarian?.fullName
        ? `Consulta com ${c.librarian.fullName}`
        : "Consulta",
      status: c?.status,
      requestedAt: c?.requestedAt ?? undefined,
      startAt: c?.startAt ?? undefined,
      endAt: c?.endAt ?? undefined,
      family: c?.family ?? undefined,
      librarian: c?.librarian ?? undefined,
      child: c?.child ?? undefined,
      library: c?.library ?? undefined,
      slot: c?.slot ?? null,
      events: c?.events ?? [],
    })
  );
}

/* --------------------- Ações na consulta -------------------- */

export async function confirmConsultation(id: number) {
  return http<any>({ url: `/consultations/${id}/confirm`, method: "POST" });
}
export async function declineConsultation(id: number) {
  return http<any>({ url: `/consultations/${id}/decline`, method: "POST" });
}

type ProposalPayload = {
  toStartAt: string;
  toEndAt: string;
  fromStartAt?: string;
  fromEndAt?: string;
  message?: string;
  proposedBy?: "LIBRARIAN" | "FAMILY" | "SYSTEM";
};

/** Cria proposta (ex.: bibliotecário propõe um slot). */
export async function createProposalForConsultation(
  consultationId: number,
  payload: ProposalPayload
) {
  return http<any>({
    url: `/consultations/${consultationId}/proposals`,
    method: "POST",
    data: {
      proposedBy: payload.proposedBy ?? "LIBRARIAN",
      toStartAt: payload.toStartAt,
      toEndAt: payload.toEndAt,
      ...(payload.fromStartAt ? { fromStartAt: payload.fromStartAt } : {}),
      ...(payload.fromEndAt ? { fromEndAt: payload.fromEndAt } : {}),
      ...(payload.message ? { message: payload.message } : {}),
    },
  });
}

/** Cancela consulta (com razão opcional). */
export async function cancelConsultation(
  consultationId: number,
  reason?: string
) {
  return http<any>({
    url: `/consultations/${consultationId}/cancel`,
    method: "POST",
    data: { reason },
  });
}

/** Aceita/recusa proposta. */
export async function acceptProposal(proposalId: number) {
  return http<any>({
    url: `/consultations/proposals/${proposalId}/accept`,
    method: "POST",
  });
}
export async function declineProposal(proposalId: number) {
  return http<any>({
    url: `/consultations/proposals/${proposalId}/decline`,
    method: "POST",
  });
}

/* ------------- Gestão de slots (bibliotecário) ------------- */

export async function listLibrarianSlots(
  librarianId: number,
  params: { from: string; to: string }
) {
  return http<any>({
    url: `/consultations/librarians/${librarianId}/slots`,
    method: "GET",
    params,
  });
}

export async function bulkCreateSlots(
  librarianId: number,
  slots: Array<{
    startAt: string;
    endAt: string;
    libraryId?: number;
    status?: "OPEN" | "BLOCKED";
  }>
) {
  return http<any>({
    url: `/consultations/librarians/${librarianId}/slots/bulk`,
    method: "POST",
    data: { slots },
  });
}

export async function updateSlotStatus(
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  return http<any>({
    url: `/consultations/slots/${slotId}`,
    method: "PATCH",
    data: { status },
  });
}

export async function listLibrarianLibraries(librarianId: number) {
  return http<Array<{ id: number; name: string }>>({
    url: `/consultations/librarians/${librarianId}/libraries`,
    method: "GET",
  });
}

// apps/web/src/services/consultations.ts
// ...
export async function listFamilyProposals(
  familyId: number,
  { page = 1, limit = 20, status = "PENDING" } = {}
) {
  return http<any>({
    url: `/consultations/families/${familyId}/proposals`,
    method: "GET",
    params: { status, page, limit },
  });
}
