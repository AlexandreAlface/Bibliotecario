/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/librarian/consultations.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers **PUROS** para querystring, fetch JSON e normalização.
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita e mapeamento defensivo de respostas do backend.
 * =============================================================================
 */

import { API_URL } from "src/services/api";

/* =============================== Helpers PUROS =============================== */

/** Constrói query-string ignorando nulos/vazios e números não finitos. */
function qs(
  params: Record<string, string | number | undefined | null>
): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    s.append(k, String(v));
  }
  return s.toString();
}

/** Faz fetch → texto → JSON “seguro”; lança erro com mensagem útil quando !ok. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...(init || {}),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers as any),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // tenta extrair { error } do backend; fallback ao texto/status
    try {
      const j = text ? JSON.parse(text) : {};
      throw new Error(j?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
  if (!text.trim()) return [] as any; // endpoints que devolvem vazio
  return JSON.parse(text) as T;
}

/* ================================ Tipos ===================================== */

export type SlotLite = {
  id: number;
  consultationId?: number | null;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  librarianId: number;
  librarianName?: string;
  librarianAvatarUrl?: string | null;
  libraryId?: number;
  libraryName?: string;
  /** Nome da família que reservou (se aplicável). */
  reservedByName?: string | null;
  /** Nome da criança associada (se aplicável). */
  reservedChildName?: string | null;
};

export type Proposal = {
  id: number;
  proposedBy: "LIBRARIAN" | "FAMILY" | "SYSTEM";
  toStartAt: string;
  toEndAt: string;
  fromStartAt?: string | null;
  fromEndAt?: string | null;
  message?: string | null;
  consultation: {
    id: number;
    family?: { id: number; fullName?: string | null } | null;
    librarian?: { id: number; fullName?: string | null } | null;
  };
};

export type ProposalsPage = {
  items: Proposal[];
  page?: number;
  limit?: number;
  total?: number;
};

export type SlotCreateInput = {
  startAt: string;
  endAt: string;
  libraryId?: number;
  status?: "OPEN" | "BLOCKED";
};

/* ======================= Normalizadores (PUROS) ============================== */

/** Normaliza um slot “rico” do backend para `SlotLite`. */
function normalizeSlot(raw: any, fallbackLibrarianId?: number): SlotLite {
  const statusRaw = String(raw?.status ?? "OPEN").toUpperCase();
  return {
    id: Number(raw?.id),
    consultationId:
      raw?.consultationId != null
        ? Number(raw.consultationId)
        : raw?.consultation?.id != null
        ? Number(raw.consultation.id)
        : null,
    startAt: String(raw?.startAt ?? raw?.begin ?? raw?.since),
    endAt: String(raw?.endAt ?? raw?.end ?? raw?.until),
    status:
      statusRaw === "BLOCKED"
        ? "BLOCKED"
        : statusRaw === "BOOKED"
        ? "BOOKED"
        : "OPEN",
    librarianId: Number(
      raw?.librarianId ?? raw?.librarian?.id ?? fallbackLibrarianId ?? 0
    ),
    librarianName: raw?.librarianName ?? raw?.librarian?.fullName ?? undefined,
    librarianAvatarUrl:
      raw?.librarianAvatarUrl ?? raw?.librarian?.avatarUrl ?? null,
    libraryId: raw?.libraryId ?? raw?.library?.id ?? undefined,
    libraryName: raw?.libraryName ?? raw?.library?.name ?? undefined,
    reservedByName:
      raw?.reservedByName ??
      raw?.consultation?.family?.fullName ??
      raw?.familyName ??
      undefined,
    reservedChildName:
      raw?.reservedChildName ??
      raw?.consultation?.child?.name ??
      raw?.childName ??
      undefined,
  };
}

/* ====================== Slots (bibliotecário) ================================ */

/**
 * Lista slots do bibliotecário num intervalo.
 * Usa exatamente o endpoint do web: GET /consultations/librarians/:id/slots
 */
export async function listLibrarianSlots(
  librarianId: number,
  params: { from: string; to: string }
): Promise<SlotLite[]> {
  const url = `${API_URL}/consultations/librarians/${librarianId}/slots?${qs(
    params
  )}`;
  const data = await fetchJson<any[]>(url);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((s) => normalizeSlot(s, librarianId));
}

/**
 * Obtém slots “abertos” para o picker de reagendamento.
 * GET /consultations/slots?from=&to=&(libraryId|librarianId)
 */
export async function listOpenSlots(params: {
  from: string; // ISO
  to: string; // ISO
  libraryId?: number;
  librarianId?: number;
}): Promise<SlotLite[]> {
  const url = `${API_URL}/consultations/slots?${qs(params)}`;
  const data = await fetchJson<any[]>(url);
  const arr = Array.isArray(data) ? data : [];
  return arr.map((s) => normalizeSlot(s));
}

/** Cria um slot. */
export async function createSlot(payload: {
  startAt: string;
  endAt: string;
  librarianId: number;
  libraryId?: number;
  status?: "OPEN" | "BLOCKED";
}) {
  const url = `${API_URL}/consultations/slots`;
  return fetchJson(url, { method: "POST", body: JSON.stringify(payload) });
}

/** Cria vários slots (bulk) para um bibliotecário. */
export async function bulkCreateSlots(
  librarianId: number,
  slots: SlotCreateInput[]
) {
  const url = `${API_URL}/consultations/librarians/${librarianId}/slots/bulk`;
  return fetchJson(url, { method: "POST", body: JSON.stringify({ slots }) });
}

/** Atualiza o estado de um slot (bloquear/desbloquear). */
export async function updateSlotStatus(
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  const url = `${API_URL}/consultations/slots/${slotId}`;
  return fetchJson(url, { method: "PATCH", body: JSON.stringify({ status }) });
}

/**
 * Tenta apagar um slot; se o backend não suportar DELETE,
 * faz fallback para marcar como BLOCKED.
 */
export async function deleteSlot(slotId: number) {
  try {
    const res = await fetch(`${API_URL}/consultations/slots/${slotId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return true;
  } catch {
    await updateSlotStatus(slotId, "BLOCKED");
    return true;
  }
}

/* =================== Reagendamentos / Propostas ============================= */

/** Lista propostas de reagendamento do bibliotecário (paginação opcional). */
export async function listLibrarianProposals(
  librarianId: number,
  {
    page = 1,
    limit = 20,
    status = "PENDING",
  }: { page?: number; limit?: number; status?: string } = {}
): Promise<ProposalsPage> {
  const url = `${API_URL}/consultations/librarians/${librarianId}/proposals?${qs(
    { status, page, limit }
  )}`;
  const data = await fetchJson<any>(url);
  if (data && Array.isArray(data.items)) return data as ProposalsPage;
  return {
    items: Array.isArray(data) ? (data as Proposal[]) : [],
    page,
    limit,
    total: undefined,
  };
}

/** Cria proposta de reagendamento para uma consulta. */
export async function createProposalForConsultation(
  consultationId: number,
  payload: {
    toStartAt: string;
    toEndAt: string;
    fromStartAt?: string;
    fromEndAt?: string;
    message?: string;
    proposedBy?: "LIBRARIAN" | "FAMILY" | "SYSTEM";
  }
) {
  const url = `${API_URL}/consultations/${consultationId}/proposals`;
  return fetchJson(url, {
    method: "POST",
    body: JSON.stringify({
      proposedBy: payload.proposedBy ?? "LIBRARIAN",
      toStartAt: payload.toStartAt,
      toEndAt: payload.toEndAt,
      ...(payload.fromStartAt ? { fromStartAt: payload.fromStartAt } : {}),
      ...(payload.fromEndAt ? { fromEndAt: payload.fromEndAt } : {}),
      ...(payload.message ? { message: payload.message } : {}),
    }),
  });
}

/** Aceita uma proposta (normalmente criada pela família). */
export async function acceptProposal(proposalId: number) {
  const url = `${API_URL}/consultations/proposals/${proposalId}/accept`;
  return fetchJson(url, { method: "POST" });
}

/** Recusa/cancela uma proposta. */
export async function declineProposal(proposalId: number) {
  const url = `${API_URL}/consultations/proposals/${proposalId}/decline`;
  return fetchJson(url, { method: "POST" });
}

/** Verifica conflito no calendário do bibliotecário para um intervalo. */
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
): Promise<{ conflict: boolean }> {
  const s = typeof startAt === "string" ? startAt : startAt.toISOString();
  const e = typeof endAt === "string" ? endAt : endAt.toISOString();
  const q = new URLSearchParams({ startAt: s, endAt: e });
  if (excludeConsultationId)
    q.set("excludeConsultationId", String(excludeConsultationId));
  const url = `${API_URL}/consultations/librarians/${librarianId}/conflicts?${q.toString()}`;
  return fetchJson(url);
}

/* ============== (Opcional) Pedidos pendentes para o bibliotecário =========== */

/** Lista consultas pendentes futuras (ordem cronológica ascendente). */
export async function listPendingConsultationsForLibrarian(
  librarianId: number,
  { limit = 100, from }: { limit?: number; from?: string } = {}
) {
  const url = `${API_URL}/consultations/all?${qs({
    limit,
    order: "asc",
    status: "PENDING",
    librarianId,
    from: from ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  })}`;
  return fetchJson(url);
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
