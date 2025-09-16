// apps/web/src/services/consultations.ts
export type ConsultaLite = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  scheduledAt?: string;
  status?: string;
  familyId?: number;
  librarianId?: number;
  librarianName?: string;
  childId?: number;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

/* ----------------------------- helpers ----------------------------- */
function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    s.append(k, String(v));
  }
  return s.toString();
}

function getAccessTokenFromCookie(): string | undefined {
  const m = document.cookie.match(/(?:^|;\s*)bf_access=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

async function fetchJson(url: string, init?: RequestInit) {
  const bearer = getAccessTokenFromCookie();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as any),
  };
  if (bearer && !headers.Authorization) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });
  if (res.status === 204) return [];
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = raw ? JSON.parse(raw) : {};
      throw new Error(j?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(
        `HTTP ${res.status}${raw ? `: ${raw.slice(0, 160)}` : ""}`
      );
    }
  }

  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Resposta não-JSON inesperada do servidor.");
  }
}

/* ------------------------- próximas consultas ------------------------- */
export async function getNextConsultas(
  limit = 6,
  opts?: { familyId?: number; childId?: number; librarianId?: number }
): Promise<ConsultaLite[]> {
  // 👇 evita 400 quando a sessão ainda não carregou
  const hasKey =
    Number.isFinite(opts?.familyId as number) ||
    Number.isFinite(opts?.librarianId as number);
  if (!hasKey) return [];

  const baseParams = qs({
    limit,
    familyId: opts?.familyId,
    childId: opts?.childId,
    librarianId: opts?.librarianId,
  });

  try {
    const url = `${API_BASE}/consultations/next?${baseParams}`;
    const items = await fetchJson(url);
    if (Array.isArray(items)) return items as ConsultaLite[];
  } catch (e) {
    console.debug("fallback /consultations/all por falha no /next:", e);
  }

  // 2) fallback: /all (normaliza para ConsultaLite)
  const now = new Date();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const urlAll = `${API_BASE}/consultations/all?${qs({
    limit: Math.max(100, limit),
    from: monthStart.toISOString(),
    order: "asc",
    familyId: opts?.familyId,
    childId: opts?.childId,
    librarianId: opts?.librarianId,
  })}`;

  const full = await fetchJson(urlAll);

  const lite: ConsultaLite[] = (Array.isArray(full) ? full : [])
    .filter((c: any) =>
      ["PENDING", "CONFIRMED"].includes(String(c.status || "").toUpperCase())
    )
    .map((c: any) => ({
      id: Number(c.id),
      title:
        c.title ||
        `Consulta de ${c?.child?.name ?? "criança"}${
          c?.library?.name ? ` — ${c.library.name}` : ""
        }`,
      date: c.startAt,
      scheduledAt: c.startAt,
      status: c.status,
      familyId: c.familyId,
      childId: c.childId,
      librarianId: c.librarianId,
      librarianName: c?.librarian?.fullName ?? undefined,
    }))
    .sort(
      (a, b) =>
        new Date(a.scheduledAt || a.date || 0).getTime() -
        new Date(b.scheduledAt || b.date || 0).getTime()
    )
    .slice(0, limit);

  return lite;
}

/* ----------------------------- slots abertos ----------------------------- */
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

/** Lista slots abertos no intervalo [from,to]. Aceita filtros opcionais */
export async function listOpenSlots(params: {
  from: string; // ISO
  to: string; // ISO
  libraryId?: number;
  librarianId?: number;
}): Promise<SlotLite[]> {
  const url = `${API_BASE}/consultations/slots?${qs(params)}`;
  const data = await fetchJson(url);

  // Se a API já devolver no formato SlotLite, devolvemos direto.
  // Caso venha "rich", mapeamos.
  if (
    Array.isArray(data) &&
    data.length &&
    "startAt" in data[0] &&
    "endAt" in data[0]
  ) {
    // tentativa simples de detetar shape
    return data as SlotLite[];
  }

  // mapeamento defensivo (caso venha com relações aninhadas)
  const mapped: SlotLite[] = (Array.isArray(data) ? data : []).map(
    (s: any) => ({
      id: Number(s.id),
      startAt: String(s.startAt),
      endAt: String(s.endAt),
      status:
        (s.status || "OPEN").toUpperCase() === "BOOKED" ? "BOOKED" : "OPEN",
      librarianId: Number(s.librarianId ?? s.librarian?.id),
      librarianName: s.librarianName ?? s.librarian?.fullName,
      librarianAvatarUrl:
        s.librarianAvatarUrl ?? s.librarian?.avatarUrl ?? null,
      libraryId: s.libraryId ?? s.library?.id,
      libraryName: s.libraryName ?? s.library?.name,
    })
  );

  return mapped;
}

/** Cria consulta para um slot */
export async function createConsultationWithSlot(payload: {
  familyId: number;
  librarianId: number;
  childId?: number;
  libraryId?: number;
  slotId: number;
}): Promise<ConsultaLite> {
  const url = `${API_BASE}/consultations`;
  const data = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data as ConsultaLite;
}

export async function listLibrarianProposals(
  librarianId: number,
  { page = 1, limit = 20, status = "PENDING" } = {}
) {
  const url = `${API_BASE}/librarians/${librarianId}/proposals?status=${status}&page=${page}&limit=${limit}`;
  return fetchJson(url); // 👈 antes era fetch(...)
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
  const q = new URLSearchParams({ startAt: s, endAt: e });
  if (excludeConsultationId)
    q.set("excludeConsultationId", String(excludeConsultationId));
  const url = `${API_BASE}/librarians/${librarianId}/conflicts?${q.toString()}`;
  return fetchJson(url); // 👈 antes era fetch(...)
}

export async function listPendingConsultationsForLibrarian(
  librarianId: number,
  { limit = 100, from }: { limit?: number; from?: string } = {}
) {
  const url = `${API_BASE}/consultations/all?${qs({
    limit,
    order: "asc",
    status: "PENDING",
    librarianId,
    from: from ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), // última semana por defeito
  })}`;
  return fetchJson(url);
}

export async function confirmConsultation(id: number) {
  const url = `${API_BASE}/consultations/${id}/confirm`;
  return fetchJson(url, { method: "POST" });
}

export async function declineConsultation(id: number) {
  const url = `${API_BASE}/consultations/${id}/decline`;
  return fetchJson(url, { method: "POST" });
}

/** Cria uma proposta (por ex. bibliotecário propõe um slot) */
export async function createProposalForConsultation(
  consultationId: number,
  payload: {
    toStartAt: string;
    toEndAt: string;
    message?: string;
    proposedBy?: "LIBRARIAN" | "FAMILY" | "SYSTEM";
  }
) {
  const url = `${API_BASE}/consultations/${consultationId}/proposals`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proposedBy: payload.proposedBy ?? "LIBRARIAN",
      ...payload,
    }),
  });
}

export async function acceptProposal(proposalId: number) {
  const url = `${API_BASE}/consultations/proposals/${proposalId}/accept`;
  return fetchJson(url, { method: "POST" });
}

export async function declineProposal(proposalId: number) {
  const url = `${API_BASE}/consultations/proposals/${proposalId}/decline`;
  return fetchJson(url, { method: "POST" });
}

export async function listFamilyProposals(
  familyId: number,
  { page = 1, limit = 20, status = "PENDING" } = {}
) {
  const url = `${API_BASE}/consultations/families/${familyId}/proposals?status=${status}&page=${page}&limit=${limit}`;
  return fetchJson(url);
}

/* --------- gestão de slots (bibliotecário) --------- */
export async function listLibrarianSlots(
  librarianId: number,
  params: { from: string; to: string }
) {
  const url = `${API_BASE}/consultations/librarians/${librarianId}/slots?${qs(
    params
  )}`;
  return fetchJson(url);
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
  const url = `${API_BASE}/consultations/librarians/${librarianId}/slots/bulk`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots }),
  });
}

export async function updateSlotStatus(
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  const url = `${API_BASE}/consultations/slots/${slotId}`;
  return fetchJson(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function listLibrarianLibraries(librarianId: number) {
  const url = `${API_BASE}/consultations/librarians/${librarianId}/libraries`;
  return fetchJson(url) as Promise<Array<{ id: number; name: string }>>;
}
