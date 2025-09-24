// apps/mobile/src/services/librarian/consultations.ts
import { API_URL } from "src/services/api";

/* ---------------- helpers ---------------- */
function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    s.append(k, String(v));
  }
  return s.toString();
}

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
    try {
      const j = text ? JSON.parse(text) : {};
      throw new Error(j?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
  if (!text.trim()) return [] as any;
  return JSON.parse(text);
}

/* ---------------- tipos ---------------- */
export type SlotLite = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  librarianId: number;
  librarianName?: string;
  librarianAvatarUrl?: string | null;
  libraryId?: number;
  libraryName?: string;
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

/* ---------------- Slots (bibliotecário) ---------------- */

// slots do bibliotecário num intervalo (mesmo endpoint do web)
export async function listLibrarianSlots(
  librarianId: number,
  params: { from: string; to: string }
): Promise<SlotLite[]> {
  const url = `${API_URL}/consultations/librarians/${librarianId}/slots?${qs(
    params
  )}`;
  const data = await fetchJson(url);
  return (Array.isArray(data) ? data : []).map((s: any) => ({
    id: Number(s.id),
    startAt: String(s.startAt),
    endAt: String(s.endAt),
    status: (s.status || "OPEN").toUpperCase(),
    librarianId: Number(s.librarianId ?? s.librarian?.id ?? librarianId),
    librarianName: s.librarianName ?? s.librarian?.fullName ?? undefined,
    librarianAvatarUrl:
      s.librarianAvatarUrl ?? s.librarian?.avatarUrl ?? null,
    libraryId: s.libraryId ?? s.library?.id ?? undefined,
    libraryName: s.libraryName ?? s.library?.name ?? undefined,
  }));
}

// slots abertos (para o picker de reagendamento)
export async function listOpenSlots(params: {
  from: string; // ISO
  to: string;   // ISO
  libraryId?: number;
  librarianId?: number;
}): Promise<SlotLite[]> {
  const url = `${API_URL}/consultations/slots?${qs(params)}`;
  const data = await fetchJson(url);
  const arr = Array.isArray(data) ? data : [];
  // já pode vir normalizado; caso venha “rich”, mapeamos defensivamente
  return arr.map((s: any) => ({
    id: Number(s.id),
    startAt: String(s.startAt ?? s.begin ?? s.since),
    endAt: String(s.endAt ?? s.end ?? s.until),
    status: ((s.status ?? "OPEN") as string).toUpperCase() === "BOOKED" ? "BOOKED" :
            ((s.status ?? "OPEN") as string).toUpperCase() === "BLOCKED" ? "BLOCKED" : "OPEN",
    librarianId: Number(s.librarianId ?? s.librarian?.id ?? 0),
    librarianName: s.librarianName ?? s.librarian?.fullName ?? undefined,
    librarianAvatarUrl:
      s.librarianAvatarUrl ?? s.librarian?.avatarUrl ?? null,
    libraryId: s.libraryId ?? s.library?.id ?? undefined,
    libraryName: s.libraryName ?? s.library?.name ?? undefined,
  }));
}

// criar 1 slot
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

// criar vários (bulk)
export async function bulkCreateSlots(
  librarianId: number,
  slots: Array<{
    startAt: string;
    endAt: string;
    libraryId?: number;
    status?: "OPEN" | "BLOCKED";
  }>
) {
  const url = `${API_URL}/consultations/librarians/${librarianId}/slots/bulk`;
  return fetchJson(url, {
    method: "POST",
    body: JSON.stringify({ slots }),
  });
}

// atualizar estado (bloquear/desbloquear)
export async function updateSlotStatus(
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  const url = `${API_URL}/consultations/slots/${slotId}`;
  return fetchJson(url, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// tenta DELETE; se não existir, cai para PATCH BLOCKED
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

/* ---------------- Reagendamentos / Propostas ---------------- */

// propostas pendentes do bibliotecário (lista paginada)
export async function listLibrarianProposals(
  librarianId: number,
  { page = 1, limit = 20, status = "PENDING" }: { page?: number; limit?: number; status?: string } = {}
): Promise<ProposalsPage> {
  const url =
    `${API_URL}/consultations/librarians/${librarianId}/proposals?` +
    qs({ status, page, limit });
  const data = await fetchJson(url);
  // normalizar para { items, page, limit, total }
  if (data && Array.isArray((data as any).items)) return data as ProposalsPage;
  return { items: Array.isArray(data) ? (data as Proposal[]) : [], page, limit, total: undefined };
}

// criar proposta de reagendamento (bibliotecário → família)
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

// aceitar proposta (quando veio da família)
export async function acceptProposal(proposalId: number) {
  const url = `${API_URL}/consultations/proposals/${proposalId}/accept`;
  return fetchJson(url, { method: "POST" });
}

// recusar/cancelar proposta
export async function declineProposal(proposalId: number) {
  const url = `${API_URL}/consultations/proposals/${proposalId}/decline`;
  return fetchJson(url, { method: "POST" });
}

// detetar conflitos no calendário do bibliotecário
export async function checkLibrarianConflict(
  librarianId: number,
  {
    startAt,
    endAt,
    excludeConsultationId,
  }: { startAt: string | Date; endAt: string | Date; excludeConsultationId?: number }
): Promise<{ conflict: boolean }> {
  const s = typeof startAt === "string" ? startAt : startAt.toISOString();
  const e = typeof endAt === "string" ? endAt : endAt.toISOString();
  const q = new URLSearchParams({ startAt: s, endAt: e });
  if (excludeConsultationId) q.set("excludeConsultationId", String(excludeConsultationId));
  const url = `${API_URL}/consultations/librarians/${librarianId}/conflicts?${q.toString()}`;
  return fetchJson(url);
}

/* ---------------- (opcional) pedidos pendentes ---------------- */

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
