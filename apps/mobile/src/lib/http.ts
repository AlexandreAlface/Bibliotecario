/**
 * =============================================================================
 *  Módulo: apps/mobile/src/lib/http.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers **PUROS** e pequenos (≤ 30 linhas).
 *   • Tipagem genérica nos helpers (get/post/patch/del).
 *   • Normalização de erros de Axios (mensagem consistente).
 * =============================================================================
 */

import axios, { type AxiosError } from "axios";
import Constants from "expo-constants";

/* =============================== Helpers PUROS =============================== */

/** Resolve a URL base para a API a partir de várias fontes (com fallback). */
function pickApiUrl(): string {
  const c = (Constants?.expoConfig?.extra as any)?.API_URL;
  return (
    (typeof c === "string" && c) ||
    process.env.EXPO_PUBLIC_API_URL ||
    "http://localhost:3333/api"
  );
}

/** Converte um erro Axios numa instância de `Error` com mensagem útil. */
function normalizeAxiosError(e: unknown): Error {
  const ax = e as AxiosError<any>;
  const serverMsg =
    (ax.response?.data &&
      (ax.response.data.error || ax.response.data.message)) ||
    ax.response?.statusText;
  const msg = serverMsg || ax.message || "Erro de rede";
  return new Error(msg);
}

/* ================================ Instância ================================= */

export const API_URL = pickApiUrl();

/** Instância Axios partilhada (cookies ON). */
export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // necessário para sessão baseada em cookies
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/* ================================== API ===================================== */

/** GET tipado — devolve `res.data` já tipado. */
export async function get<T = any>(url: string, params?: any): Promise<T> {
  try {
    const res = await http.get<T>(url, { params });
    return res.data;
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

/** POST tipado — devolve `res.data` já tipado. */
export async function post<T = any>(url: string, body?: any): Promise<T> {
  try {
    const res = await http.post<T>(url, body);
    return res.data;
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

/** PATCH tipado — devolve `res.data` já tipado. */
export async function patch<T = any>(url: string, body?: any): Promise<T> {
  try {
    const res = await http.patch<T>(url, body);
    return res.data;
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

/** DELETE tipado — devolve `res.data` já tipado. */
export async function del<T = any>(url: string): Promise<T> {
  try {
    const res = await http.delete<T>(url);
    return res.data;
  } catch (e) {
    throw normalizeAxiosError(e);
  }
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
