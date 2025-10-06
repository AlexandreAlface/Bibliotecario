/**
 * Alexandre Brrissos 21131
 * Descrição: Loader de dados para a página de Métricas do Admin.
 *            Reutiliza serviços existentes e expõe apenas o necessário à UI.
 */
import {
  getConsultationsHistory,
  listOpenSlots,
  type ConsultationFull,
  type SlotLite,
} from "@/services/consultations";
import { http, isApiError } from "../https";

/* ---------- Tipos ---------- */

export type MetricsFilters = {
  from: string; // ISO
  to: string;   // ISO
  libraryId?: number;
};

export type AdminMetrics = {
  weeklyConsultations: { week: string; count: number }[];
  slotUtilization: { date: string; percent: number }[];
  activeLibrarians: number;
  familiesServed: number;
};

export type LibraryLite = { id: number; name: string };

/* ---------- Loader principal ---------- */

/**
 * Carrega dados brutos necessários à página (consultas + slots).
 * Usa /consultations/all para histórico e /consultations/slots para disponibilidade.
 */
export async function loadMetricsData({ from, to, libraryId }: MetricsFilters) {
  const status = ["PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"];

  const [consultas, openSlots] = await Promise.all([
    getConsultationsHistory({
      from,
      to,
      limit: 2000,
      order: "asc",
      status,
      ...(libraryId ? { libraryId } : {}),
    }),
    listOpenSlots({ from, to, ...(libraryId ? { libraryId } : {}) }),
  ]);

  return {
    consultas: (consultas ?? []) as ConsultationFull[],
    openSlots: (openSlots ?? []) as SlotLite[],
  };
}

/* ---------- Bibliotecas do utilizador (para selector) ---------- */

/**
 * Lista as bibliotecas às quais o admin pertence.
 * Tenta /libraries/mine; se não existir, faz fallback a /admin/metrics/libraries.
 */
export async function listMyLibraries(): Promise<LibraryLite[]> {
  try {
    const res = await http<{ items?: any[] } | any[]>({
      url: "/libraries/mine",
      method: "GET",
    });
    const arr = Array.isArray(res) ? res : res?.items ?? [];
    return arr.map((x: any) => ({ id: Number(x?.id), name: String(x?.name) }));
  } catch (e) {
    if (!(isApiError(e) && e.status === 404)) throw e;
    const alt = await http<any[]>({ url: "/admin/metrics/libraries", method: "GET" });
    return (Array.isArray(alt) ? alt : []).map((x: any) => ({
      id: Number(x?.id),
      name: String(x?.name),
    }));
  }
}

/* ---------- Métricas agregadas do backend ---------- */

/** Lê métricas agregadas para uma biblioteca específica. */
export async function getAdminMetrics(libraryId: number): Promise<AdminMetrics> {
  return http<AdminMetrics>({
    url: `/admin/libraries/${libraryId}/metrics`,
    method: "GET",
  });
}

/* ---------- Re-exports úteis ---------- */
export type { ConsultationFull } from "@/services/consultations";
