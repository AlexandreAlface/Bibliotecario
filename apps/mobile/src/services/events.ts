/**
 * ============================================================================
 *  Módulo: src/services/events.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários completos (PT-PT) e JSDoc em todo o código.
 *   • Helpers **PUROS** e reutilizáveis (normalização, querystring, limites).
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita e “fail-safe” ao consumir o backend.
 * ============================================================================
 */

import { request } from "./api";

/** Evento leve para UI mobile (normalizado). */
export type EventLite = {
  id: number | string;
  title: string;
  /** Data já formatada para pt-PT (ex.: "15/07/2025"). */
  date: string;
  /** Hora opcional (ex.: "11:00"). */
  time?: string;
  location?: string;
  /** Imagem opcional (ex.: de feed/capa). */
  imageUrl?: string | null;
};

/* =========================== Helpers PUROS ============================ */

/** Garante um inteiro positivo razoável para `limit` (1..50). */
function safeLimit(n: number, min = 1, max = 50): number {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.min(Math.max(x, min), max);
}

/** Constrói querystring de forma pura, ignorando nulos/vazios. */
function toQuery(params: Record<string, unknown>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
  return q ? `?${q}` : "";
}

/** Testa se o valor é uma string não vazia. */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Normaliza um objeto arbitrário vindo da API para `EventLite`.
 * Nunca lança — devolve um evento “seguro” (fallbacks).
 */
function toEventLite(raw: any): EventLite {
  return {
    id: raw?.id ?? String(Math.random()),
    title: isNonEmptyString(raw?.title) ? raw.title : "Evento",
    date: isNonEmptyString(raw?.date) ? raw.date : "",
    time: isNonEmptyString(raw?.time) ? raw.time : "",
    location: isNonEmptyString(raw?.location) ? raw.location : undefined,
    imageUrl:
      raw?.imageUrl === null
        ? null
        : isNonEmptyString(raw?.imageUrl)
        ? raw.imageUrl
        : undefined,
  };
}

/* ================================ API ================================= */

/**
 * Próximas consultas (novo endpoint `/consultations/next`).
 * Mantém o shape leve para a home do mobile.
 */
export async function getNextConsultas(limit = 3): Promise<EventLite[]> {
  const qs = toQuery({ limit: safeLimit(limit) });
  const rows = await request<unknown[]>(`/consultations/next${qs}`);
  const arr = Array.isArray(rows) ? rows : [];
  return arr.map(toEventLite);
}

/**
 * Próximos eventos culturais (router de `/events` suporta `type=evento`).
 * Inclui `imageUrl` se existir do lado do backend.
 */
export async function getProximosEventos(limit = 3): Promise<EventLite[]> {
  const qs = toQuery({ type: "evento", limit: safeLimit(limit) });
  const rows = await request<unknown[]>(`/events${qs}`);
  const arr = Array.isArray(rows) ? rows : [];
  return arr.map(toEventLite);
}

/* ============================== Fim ===================================
 *  Alexandre Brissos — Nº 21131
 * =======================================================================
 */
