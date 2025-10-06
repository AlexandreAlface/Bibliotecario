/**
 * ============================================================================
 *  Módulo: services/reservations
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários em PT-PT e anotações de métodos **PUROS**.
 *   • Funções curtas (≤ 30 linhas) e coesas.
 *   • Tipagem explícita do retorno (Promise<...>) e dos parâmetros.
 * ============================================================================
 */

import axios from "axios";
import { API_URL } from "./api";

/** Resposta esperada da API ao reservar um livro. */
export type ReserveResponse = {
  ok: boolean;
  id: number;
  reservedAt: string; // ISO
};

/* ============================== Helpers PUROS ============================== */

/**
 * 🔹 **PURO**: constroi URL com querystring a partir de base + path + params.
 */
function buildUrl(base: string, path: string, params: Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.append(k, String(v));
  }
  return `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
}

/**
 * 🔹 **PURO**: converte o erro da API numa mensagem amigável.
 */
function mapReservationError(err: unknown): Error {
  const resp = (err as any)?.response;
  const status = resp?.status as number | undefined;
  const code = resp?.data?.error as string | undefined;

  if (status === 409 && code === "already_reading")
    return new Error("Já estás a ler este livro.");
  if (status === 409 && code === "already_reserved")
    return new Error("Este livro já está reservado para esta criança.");
  if (status === 401 || status === 403)
    return new Error("Precisas de iniciar sessão para reservar.");
  if (status === 404) return new Error("Livro ou criança não encontrados.");
  if (status && status >= 500)
    return new Error("Serviço indisponível. Tenta mais tarde.");

  return new Error("Não foi possível reservar. Tenta novamente.");
}

/* ================================== API =================================== */

/**
 * Efetua a reserva de um livro para uma criança.
 * @param childId ID da criança.
 * @param isbn    ISBN do livro a reservar.
 */
export async function reserveBook(
  childId: number,
  isbn: string
): Promise<ReserveResponse> {
  try {
    const url = buildUrl(API_URL, "/reservations", { childId });
    const { data } = await axios.post<ReserveResponse>(
      url,
      { isbn },
      { withCredentials: true }
    );
    return data; // { ok, id, reservedAt }
  } catch (err) {
    throw mapReservationError(err);
  }
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
