// Reutiliza os serviços existentes e devolve os dados brutos necessários à página
import {
  getConsultationsHistory,
  listOpenSlots,
  type ConsultationFull,
} from "@/services/consultations";

export type MetricsFilters = {
  from: string; // ISO
  to: string; // ISO
  libraryId?: number;
};

export type AdminMetrics = {
  weeklyConsultations: { week: string; count: number }[];
  slotUtilization: { date: string; percent: number }[];
  activeLibrarians: number;
  familiesServed: number;
};

export async function loadMetricsData({ from, to, libraryId }: MetricsFilters) {
  const [cons, openSlots] = await Promise.all([
    getConsultationsHistory({
      from,
      to,
      limit: 2000,
      order: "asc",
      status: ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"],
      ...(libraryId ? { libraryId } : {}),
    } as any) as Promise<ConsultationFull[]>,
    listOpenSlots({
      from,
      to,
      limit: 2000,
      ...(libraryId ? { libraryId } : {}),
    } as any),
  ]);

  return {
    consultas: cons || [],
    openSlots: openSlots || [],
  };
}

export type { ConsultationFull } from "@/services/consultations";

export type LibraryLite = { id: number; name: string };

function apiBase() {
  const base =
    (import.meta as any).env?.VITE_API_URL ||
    (window as any).__API_BASE__ ||
    "/api";
  return String(base).replace(/\/$/, "");
}

/**
 * Lista as bibliotecas às quais o admin pertence (para o selector da página de métricas).
 * Tenta vários endpoints comuns e faz fallback a /auth/me.
 */
export async function listMyLibraries(): Promise<LibraryLite[]> {
  const res = await fetch(`${apiBase()}/libraries/mine`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`GET /libraries/mine ${res.status}`);
  const data = await res.json();
  return (data.items ?? []).map((x: any) => ({
    id: Number(x.id),
    name: String(x.name),
  }));
}

export async function getAdminMetrics(
  libraryId: number
): Promise<AdminMetrics> {
  const res = await fetch(`${apiBase()}/admin/libraries/${libraryId}/metrics`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.text()) || "metrics_failed");
  return res.json();
}
