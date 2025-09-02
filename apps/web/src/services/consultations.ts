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

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    s.append(k, String(v));
  }
  return s.toString();
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 204) return [];
  const raw = await res.text();
  if (!res.ok) {
    // tenta extrair mensagem útil
    try {
      const j = raw ? JSON.parse(raw) : {};
      throw new Error(j?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}${raw ? `: ${raw.slice(0, 120)}` : ""}`);
    }
  }
  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Resposta não-JSON inesperada do servidor.");
  }
}

/** Próximas consultas – tenta /next, cai para /all se necessário */
export async function getNextConsultas(
  limit = 6,
  opts?: { familyId?: number; childId?: number; librarianId?: number }
): Promise<ConsultaLite[]> {
  const baseParams = qs({
    limit,
    familyId: opts?.familyId,
    childId: opts?.childId,
    librarianId: opts?.librarianId,
  });

  // 1) tentativa principal
  try {
    const url = `${API_BASE}/consultations/next?${baseParams}`;
    const items = await fetchJson(url);
    if (Array.isArray(items)) return items as ConsultaLite[];
  } catch (e) {
    // segue para o fallback
    console.debug("fallback /consultations/all por falha no /next:", e);
  }

  // 2) fallback: /all (filtra por datas/estado e normaliza forma “Lite”)
  const now = new Date();
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const urlAll = `${API_BASE}/consultations/all?${qs({
    limit: Math.max(100, limit),
    from: monthStart.toISOString(),
    order: "asc",
    familyId: opts?.familyId,
    childId: opts?.childId,
    librarianId: opts?.librarianId,
  })}`;

  const full = await fetchJson(urlAll);

  // normalizar para ConsultaLite (o /all devolve objeto “rich”)
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
    .sort((a, b) =>
      new Date(a.scheduledAt || a.date || 0).getTime() -
      new Date(b.scheduledAt || b.date || 0).getTime()
    )
    .slice(0, limit);

  return lite;
}


// apps/web/src/services/consultations.ts (ADICIONAR)

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


/** Lista slots abertos no intervalo [from,to] */
export async function listOpenSlots(params: {
  from: string; // ISO
  to: string;   // ISO
  libraryId?: number;
  librarianId?: number;
}): Promise<SlotLite[]> {
  const url = `/api/consultations/slots?${qs(params)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Cria consulta para um slot */
export async function createConsultationWithSlot(payload: {
  familyId: number;
  librarianId: number;
  childId?: number;
  libraryId?: number;
  slotId: number;
}): Promise<ConsultaLite> {
  const res = await fetch(`/api/consultations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}
