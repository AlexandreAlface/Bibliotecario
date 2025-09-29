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

function normalizeConsultas(arr: any[], limit?: number): ConsultaLite[] {
  const list = (Array.isArray(arr) ? arr : [])
    .map((c: any) => ({
      id: Number(c.id),
      title:
        c.title ||
        `Consulta de ${c?.child?.name ?? "criança"}${
          c?.library?.name ? ` — ${c.library.name}` : ""
        }`,
      // muitas APIs usam startAt; outras scheduledAt ou date
      date: c.startAt ?? c.date ?? c.scheduledAt ?? null,
      scheduledAt: c.scheduledAt ?? c.startAt ?? c.date ?? null,
      status: c.status,
      familyId: c.familyId ?? c.family?.id,
      childId: c.childId ?? c.child?.id,
      // 🔴 garantir que vem o ID do bibliotecário
      librarianId: c.librarianId ?? c.librarian?.id ?? null,
      librarianName: c.librarianName ?? c.librarian?.fullName ?? undefined,
    }))
    .filter((c) => !!c.scheduledAt)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime()
    );

  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/* ------------------------- próximas consultas ------------------------- */
export async function getNextConsultas(
  limit = 6,
  opts?: { familyId?: number; childId?: number; librarianId?: number }
): Promise<ConsultaLite[]> {
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

  // 1) tenta /next e NORMALIZA
  try {
    const url = `${API_BASE}/consultations/next?${baseParams}`;
    const items = await fetchJson(url);
    if (Array.isArray(items)) {
      // muitas vezes /next não traz librarianId — normalizamos aqui
      return normalizeConsultas(items, limit);
    }
  } catch (e) {
    console.debug("fallback /consultations/all por falha no /next:", e);
  }

  // 2) fallback /all e NORMALIZA (+ filtra estados úteis)
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
  return normalizeConsultas(full, limit).filter((c) =>
    ["PENDING", "CONFIRMED"].includes(String(c.status || "").toUpperCase())
  );
}

export async function getConsultation(consultationId: number) {
  const url = `${API_BASE}/consultations/${consultationId}`;
  return fetchJson(url); // deve devolver { id, librarianId, librarian:{id,...}, ... }
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
  notes?: string; // ⬅️ NOVO: descrição opcional
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
  const url =
    `${API_BASE}/consultations/librarians/${librarianId}/proposals?` +
    `status=${status}&page=${page}&limit=${limit}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

  const res = await fetch(
    `${API_BASE}/consultations/librarians/${librarianId}/conflicts?${q.toString()}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

export async function getConsultationsHistory(params: {
  limit?: number;
  order?: "asc" | "desc";
  from?: string; // ISO
  to?: string;   // ISO
  status?: string[]; // ConsultationStatus[]
  familyId?: number;
  librarianId?: number;
  childId?: number;
}): Promise<ConsultationFull[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.order) qs.set("order", params.order);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.status?.length) qs.set("status", params.status.join(","));
  if (params.familyId) qs.set("familyId", String(params.familyId));
  if (params.librarianId) qs.set("librarianId", String(params.librarianId));
  if (params.childId) qs.set("childId", String(params.childId));

  const url = `/api/consultations/all?${qs.toString()}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Falha a carregar histórico (${res.status})`);
  }
  const raw = await res.json();

  // mapeamento leve para o formato que a página espera
  const items: ConsultationFull[] = (Array.isArray(raw) ? raw : []).map(
    (c: any) => ({
      id: c.id,
      title:
        c.child?.name
          ? `Consulta de ${c.child.name}`
          : c.librarian?.fullName
          ? `Consulta com ${c.librarian.fullName}`
          : "Consulta",
      status: c.status,
      requestedAt: c.requestedAt ?? undefined,
      startAt: c.startAt ?? undefined,
      endAt: c.endAt ?? undefined,
      family: c.family ?? undefined,
      librarian: c.librarian ?? undefined,
      child: c.child ?? undefined,
      library: c.library ?? undefined,
      slot: c.slot ?? null,
      events: c.events ?? [],
    })
  );

  return items;
}

export async function confirmConsultation(id: number) {
  const url = `${API_BASE}/consultations/${id}/confirm`;
  return fetchJson(url, { method: "POST" });
}

export async function declineConsultation(id: number) {
  const url = `${API_BASE}/consultations/${id}/decline`;
  return fetchJson(url, { method: "POST" });
}

type ProposalPayload = {
  // horário NOVO (obrigatório)
  toStartAt: string;
  toEndAt: string;
  // horário ANTIGO (opcional — só quando é reagendamento)
  fromStartAt?: string;
  fromEndAt?: string;
  // metadados
  message?: string;
  proposedBy?: "LIBRARIAN" | "FAMILY" | "SYSTEM";
};

/** Cria uma proposta (por ex. bibliotecário propõe um slot) */
export async function createProposalForConsultation(
  consultationId: number,
  payload: ProposalPayload
) {
  const url = `${API_BASE}/consultations/${consultationId}/proposals`;
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // inclui os campos from* se vierem, e default para proposedBy
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

// apps/web/src/services/consultations.ts
export async function cancelConsultation(
  consultationId: number,
  reason?: string
) {
  const url = `${API_BASE}/consultations/${consultationId}/cancel`; // ✅ usa API_BASE
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

// mantém
export async function acceptProposal(proposalId: number) {
  return fetchJson(`${API_BASE}/consultations/proposals/${proposalId}/accept`, {
    method: "POST",
  });
}
export async function declineProposal(proposalId: number) {
  return fetchJson(
    `${API_BASE}/consultations/proposals/${proposalId}/decline`,
    { method: "POST" }
  );
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
