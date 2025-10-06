/**
 * Alexandre Brrissos 21131
 * Descrição: Cliente HTTP (Axios) com cookies, base URL, normalização de erros,
 *            e helpers mínimos para chamadas tipadas.
 */

import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

/** Obtém base da API a partir de window/env; remove trailing slash. */
export function getApiBase(): string {
  const base =
    (window as any).__API_BASE__ ||
    (import.meta as any).env?.VITE_API_URL ||
    "/api";
  return String(base).replace(/\/$/, "");
}

/** Erro normalizado que a UI entende. */
export type ApiError = { status?: number; message: string; cause?: unknown };

/** True se o valor já é ApiError. */
export function isApiError(x: any): x is ApiError {
  return x && typeof x.message === "string" && "message" in x;
}

/** Converte qualquer erro Axios/JS em ApiError. */
export function asApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<any>;
    const status = e.response?.status;
    const data = e.response?.data;
    const msg =
      (data && (data.message || data.error || data.detail)) ||
      e.message ||
      "Erro de rede";
    return { status, message: String(msg), cause: e };
  }
  if (err instanceof Error) return { message: err.message, cause: err };
  return { message: "Erro inesperado", cause: err };
}

/** Instância global do Axios configurada para cookies. */
export const api: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  withCredentials: true, // envia cookie httpOnly
  timeout: 15000,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Deixa sucesso passar; mapeia erros para ApiError.
api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(asApiError(err))
);

/**
 * Faz um pedido e devolve `data` tipado.
 * @example const users = await http<User[]>({ url: "/users", method: "GET" });
 */
export async function http<T = unknown>(
  cfg: AxiosRequestConfig
): Promise<T> {
  const res = await api.request<T>(cfg);
  return res.data;
}
