/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/culturalEvents.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários e JSDoc completos (PT-PT).
 *   • Helpers **PUROS** (toQuery, safeLimit, search local com normalização).
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipos explícitos e consumo do backend robusto com fallbacks.
 * =============================================================================
 */

import { request } from "./api";

/** Estrutura leve de evento cultural usada no mobile. */
export type CulturalEvent = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;       // ISO
  endDate?: string | null; // ISO
  location?: string | null;
  category?: string | null;
  capacity?: number | null;
  imageUrl?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  /** Flag calculada para família autenticada. */
  reserved?: boolean;
};

export type ListParams = {
  /** Filtro local (lado do cliente), tal como na web. */
  q?: string;
  /** Janela temporal — 'YYYY-MM-DD'. */
  from?: string;
  /** Janela temporal — 'YYYY-MM-DD'. */
  to?: string;
  /** Tamanho da página no servidor (default 24). */
  limit?: number;
  /** Cursor de paginação opaco do servidor. */
  cursor?: number | null;
};

export type ListResponse = {
  items: CulturalEvent[];
  nextCursor: number | null;
};

/* ============================== Helpers PUROS =============================== */

/** Constrói querystring ignorando chaves indefinidas/nulas/vazias. */
function toQuery(params: Record<string, unknown>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

/** Garante um limite dentro de 1..100 (default 24). */
function safeLimit(n: number | undefined, d = 24, min = 1, max = 100): number {
  const x = Number.isFinite(n as number) ? Math.floor(n as number) : d;
  return Math.min(Math.max(x, min), max);
}

/** Normaliza strings para pesquisa: lowercase + remove acentos. */
function norm(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Match simples “contém” entre query e vários campos do evento. */
function matchesQ(ev: CulturalEvent, q: string): boolean {
  if (!q.trim()) return true;
  const needle = norm(q);
  const hay = [
    ev.title,
    ev.description ?? "",
    ev.location ?? "",
    ev.category ?? "",
    ev.libraryName ?? "",
  ]
    .map(norm)
    .join(" • ");
  return hay.includes(needle);
}

/* ================================= API ===================================== */

/**
 * Lista eventos culturais com paginação por cursor no servidor.
 * Nota: o filtro `q` é aplicado **client-side** (apenas à página atual),
 * replicando o comportamento da interface web — o `nextCursor` mantém-se.
 */
export async function listCulturalEvents(params: ListParams): Promise<ListResponse> {
  const { q, from, to, cursor } = params || {};

  // Montagem segura de query (sem base dummy)
  const qs = toQuery({
    from,
    to,
    cursor,
    limit: safeLimit(params?.limit),
  });

  // Pedido ao backend
  const resp = await request<ListResponse>(`/cultural-events${qs}`);

  // Filtro local por `q` apenas aos items da página corrente
  const filtered = q ? resp.items.filter((ev) => matchesQ(ev, q)) : resp.items;

  return {
    items: filtered,
    nextCursor: resp.nextCursor ?? null,
  };
}

/**
 * Reserva o evento para a família autenticada (ou criança ativa, conforme backend).
 * Lança erro se o backend rejeitar por lotação, conflito, etc (via `request`).
 */
export async function reserveEvent(eventId: number) {
  return request(`/cultural-events/${eventId}/reservations`, { method: "POST" });
}

/**
 * Cancela a reserva do evento corrente para o utilizador autenticado.
 */
export async function cancelEventReservation(eventId: number) {
  return request(`/cultural-events/${eventId}/reservations`, { method: "DELETE" });
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
