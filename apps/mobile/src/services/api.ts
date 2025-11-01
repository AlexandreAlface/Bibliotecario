/**
 * =============================================================================
 *  Módulo: src/services/api.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT) e helpers **PUROS** reutilizáveis.
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita, tratamento de erros consistente e alias `api`.
 *   • Compatível com chamadas existentes que usam `request` **ou** `api`.
 * =============================================================================
 */

import Constants from "expo-constants";

/** URL base do backend (Expo → extra.API_URL, env → EXPO_PUBLIC_API_URL, fallback local). */
export const API_URL: string =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3333/api";

/** Extensão de RequestInit que permite enviar `json` e definir `timeoutMs`. */
export type FetchInit = RequestInit & { json?: unknown; timeoutMs?: number };


/** Erro normalizado devolvido pelo cliente de API. */
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

/** Retorna `fallback` se a API responder com um destes status (ex.: 400/403/404). */
export async function requestOr<T>(
  path: string,
  init: FetchInit,
  fallback: T,
  swallowStatuses: number[] = [400, 403, 404]
): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (e: any) {
    if (swallowStatuses.includes(Number(e?.status))) return fallback;
    throw e;
  }
}

/* =========================== Helpers PUROS ============================ */

/** Faz parse “seguro” do JSON devolvendo `null` quando vazio/malformado. */
function safeJson(text: string): any {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Cria um erro enriquecido com `status`, `code` e `details`. */
function toApiError(res: Response, data: any): ApiError {
  const url = (res as any)?.url || "";
  const msg =
    (data && (data.error || data.message)) ||
    res.statusText ||
    `Erro ${res.status}`;
  const err: ApiError = new Error(`${msg} [${res.status}] ${url}`);
  err.status = res.status;
  err.code = data?.code || data?.errorCode;
  err.details = data;
  return err;
}

/** AbortController com timeout simples (ms). */
function withTimeout(ms?: number): AbortController | undefined {
  if (!ms || ms <= 0) return undefined;
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl;
}

/* ============================ Cliente HTTP =========================== */

/**
 * Requisição genérica:
 * - Envia `json` quando presente (Content-Type: application/json).
 * - Inclui cookies (`credentials: "include"`).
 * - Timeout opcional via `timeoutMs`.
 * - Lança `ApiError` quando `!res.ok`.
 */
export async function request<T = any>(
  path: string,
  init: FetchInit = {}
): Promise<T> {
  const { json, headers, timeoutMs, ...rest } = init;
  const ctrl = withTimeout(timeoutMs);

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    signal: ctrl?.signal,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: json ? JSON.stringify(json) : (rest as any).body,
    ...rest,
  });

  const data = safeJson(await res.text());
  if (!res.ok) throw toApiError(res, data);
  return data as T;
}

/** Alias compatível com módulos que importam `{ api }` em vez de `request`. */
export const api = request;

/* ========================== Atalhos convenientes ===================== */

/** GET tipado. */
export function get<T = any>(path: string, init?: Omit<FetchInit, "method">) {
  return request<T>(path, { method: "GET", ...(init || {}) });
}

export function getOr<T>(
  path: string,
  fallback: T,
  swallowStatuses?: number[]
) {
  return requestOr<T>(path, { method: "GET" }, fallback, swallowStatuses);
}

/** POST tipado (automaticamente serializa `json`). */
export function post<T = any>(
  path: string,
  json?: unknown,
  init?: Omit<FetchInit, "method" | "json">
) {
  return request<T>(path, { method: "POST", json, ...(init || {}) });
}

/** PATCH tipado. */
export function patch<T = any>(
  path: string,
  json?: unknown,
  init?: Omit<FetchInit, "method" | "json">
) {
  return request<T>(path, { method: "PATCH", json, ...(init || {}) });
}

/** DELETE tipado. */
export function del<T = any>(path: string, init?: Omit<FetchInit, "method">) {
  return request<T>(path, { method: "DELETE", ...(init || {}) });
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
