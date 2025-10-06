/**
 * =============================================================================
 *  Módulo: src/services/ratings.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários claros (PT-PT) e cabeçalho com autor/nº aluno.
 *   • Helpers **PUROS** (sem efeitos laterais) para querystrings e erros.
 *   • Funções pequenas (≤ 30 linhas), coesas e tipadas.
 *   • Tipos explícitos para itens pendentes e resultados.
 * =============================================================================
 */

import { API_URL, request } from "./api";
import axios from "axios";

/* =============================== Tipos =============================== */

/** Item pendente para avaliação / rating. */
export type PendingRating = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  childId: number;
  childName?: string | null;
  readingId?: number | null;
  state?: "reserved" | "reading" | "finished";
  stars?: number | null;
  comment?: string | null;
  finishedAt?: string | null; // ISO
};

/* ============================ Helpers PUROS =========================== */

/** 🔹 **PURO**: cria URLSearchParams ignorando valores vazios/nulos. */
function toParams(obj: Record<string, unknown>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  return qs;
}

/**
 * 🔹 **PURO**: mapeia erros Axios para mensagens legíveis.
 * Usa a chave "status:errorCode" (ex.: "409:reading_not_finished").
 */
function mapAxiosError(
  err: any,
  map: Record<string, string>,
  fallback: string
): never {
  const status = err?.response?.status as number | undefined;
  const code = err?.response?.data?.error as string | undefined;
  if (status && code) {
    const key = `${status}:${code}`;
    if (map[key]) throw new Error(map[key]);
  }
  throw new Error(fallback);
}

/** 🔹 **PURO**: valida nº de estrelas [1..5]; lança se inválido. */
function assertStars(stars: number): void {
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new Error("As estrelas têm de estar entre 1 e 5.");
  }
}

/** 🔹 **PURO**: assegura array tipado. */
function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/* ================================= API ================================ */

/**
 * Guarda um rating (estrelas + comentário opcional).
 * Envia sempre credenciais; o backend associa leitura/reserva recente.
 */
export async function saveRating(input: {
  isbn: string;
  stars: number;
  comment?: string;
  childId?: number;
  familyId?: number; // envia sempre o familyId mesmo em child mode
}) {
  try {
    assertStars(input.stars);
    const { data } = await axios.post(`${API_URL}/ratings`, input, {
      withCredentials: true,
    });
    return data as { ok: boolean; rating: unknown };
  } catch (err: any) {
    return mapAxiosError(
      err,
      {
        "409:reading_not_finished":
          "Só podes avaliar depois de terminar a leitura.",
      },
      "Não foi possível guardar a avaliação."
    );
  }
}

/**
 * Lista ratings pendentes (por criança/família).
 * Pode enviar cabeçalho `x-user-id` quando é útil juntar avaliações do utilizador.
 */
export async function listPendingRatings(opts: {
  childId?: number;
  familyId?: number;
  limit?: number;
  userIdHeader?: number; // envia como x-user-id
}): Promise<PendingRating[]> {
  const qs = toParams({
    childId: opts.childId,
    familyId: opts.familyId,
    limit: opts.limit,
  });

  const headers: Record<string, string> = {};
  const xUser = opts.userIdHeader ?? opts.familyId;
  if (xUser) headers["x-user-id"] = String(xUser);

  const data = await request<unknown>(
    `/ratings/pending?${qs.toString()}`,
    headers ? { headers } : undefined
  );
  return asArray<PendingRating>(data);
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
