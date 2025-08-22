// apps/web/src/services/consultations.ts
export type ConsultaLite = {
  id: number;
  title: string;
  date?: string;          // ISO opcional
  time?: string;
  scheduledAt?: string;   // ISO opcional
  status?: string;
  familyId?: number;
  librarianId?: number;
  librarianName?: string;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

// helpers
function q(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.append(k, String(v));
  });
  return s.toString();
}

/** Próximas consultas (usa /api/consultations/next do backend) */
export async function getNextConsultas(limit = 6): Promise<ConsultaLite[]> {
  const url = `${API_BASE}/consultations/next?limit=${limit}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Lista geral com filtros simples (fallback / listagem) */
export async function listConsultas(params?: {
  limit?: number;
  status?: "PENDENTE" | "CONFIRMADO" | "RECUSADO";
  familyId?: number;
  librarianId?: number;
}): Promise<ConsultaLite[]> {
  const url = `${API_BASE}/consultations?${q(params || {})}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
