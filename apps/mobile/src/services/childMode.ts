/**
 * =============================================================================
 *  Módulo: src/services/childMode.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helper **PURO** para POST JSON (sem efeitos laterais).
 *   • Funções curtas (≤ 30 linhas) e tipadas.
 *   • Usa `request` (exportado por ./api) — evita o erro “no exported member 'api'”.
 * =============================================================================
 */

import { request } from "./api";

/** Resposta genérica dos endpoints de “child mode”. */
export type ActAsResponse = {
  ok?: boolean;
  actingChildId?: number | null;
  // Campos extra podem existir conforme o backend — mantemos abertura:
  [k: string]: unknown;
};

/* ============================== Helpers PUROS =============================== */

/**
 * POST JSON simples contra o backend.
 * @param path  Caminho relativo (prefixado por API_URL no `request`).
 * @param json  Corpo JSON opcional.
 */
const postJson = <T = ActAsResponse>(path: string, json?: unknown) =>
  request<T>(path, { method: "POST", json });

/* ================================= API ===================================== */

/**
 * Alterna o contexto para “agir como” uma criança.
 * Útil no modo família → avaliar/reservar em nome de um filho.
 * @param childId ID da criança
 */
export const childModeApi = {
  actAs: (childId: number) => postJson("/auth/act-as-child", { childId }),

  /** Limpa o contexto “act-as”, regressando ao utilizador família. */
  clear: () => postJson("/auth/act-as-clear"),
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
