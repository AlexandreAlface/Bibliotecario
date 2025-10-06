/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/readings.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários detalhados (PT-PT) e cabeçalho com autor/nº aluno.
 *   • Helpers **PUROS** para querystrings e tratamento de erros.
 *   • Funções pequenas (≤ 30 linhas), coesas e tipadas.
 *   • Tipos claros para leituras, pendentes e concluídas.
 * =============================================================================
 */

import { API_URL, request } from "./api";
import axios from "axios";

/* =============================== Tipos =============================== */

/** Linha simplificada de leitura (em curso ou recente). */
export type ReadingLite = {
  id: number;
  childId: number;
  childName?: string | null;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  date?: string | null; // ISO
};

type Options = {
  childId?: number;
  childIds?: number[];
  familyId?: number;
};

/** Estrutura para uma leitura terminada (com avaliação opcional). */
export type FinishedReading = {
  id: number;
  childId: number;
  childName?: string | null;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  stars?: number | null;
  comment?: string | null;
};

/** Linha “pendente” para avaliação/estado de leitura. */
export type PendingRatingRow = {
  reservationId?: number;
  readingId?: number | null;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  startedAt?: string | null;
  finishedAt?: string | null;
  stars: number | null;
  comment?: string | null;
  ratedAt?: string | null;
};

/* ============================ Helpers PUROS =========================== */

/** 🔹 **PURO**: cria `URLSearchParams` ignorando valores vazios/nulos. */
function toParams(obj: Record<string, unknown>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  return qs;
}

/**
 * 🔹 **PURO**: extrai `status`/`error` de um erro Axios e
 * devolve uma mensagem mapeada caso exista.
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

/** 🔹 **PURO**: garante limite positivo. */
function safeLimit(n: number, def = 12): number {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : def;
}

/** 🔹 **PURO**: devolve array seguro. */
function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/* ================================ API ================================= */

/**
 * Lista registos pendentes para avaliação ou continuação.
 * Envia opcionalmente `userId` para cruzar as estrelas do utilizador.
 */
export async function listPendingRatings(opts: {
  childId?: number;
  familyId?: number;
  limit?: number;
  userId?: number; // ?userId= para backend juntar as estrelas do utilizador
}): Promise<PendingRatingRow[]> {
  const qs = toParams({
    childId: opts.childId,
    familyId: opts.familyId,
    limit: opts.limit,
    userId: opts.userId,
  });
  const data = await request<PendingRatingRow[]>(
    `/ratings/pending?${qs.toString()}`
  );
  return asArray<PendingRatingRow>(data);
}

/**
 * Leituras atuais (histórico recente + em curso) vindas de `/readings`.
 * Aceita filtros por criança(s) e/ou família.
 */
export async function getLeiturasAtuais(
  limit = 4,
  opts: Options = {}
): Promise<ReadingLite[]> {
  const qs = toParams({
    limit: safeLimit(limit, 4),
    childId: opts.childId,
    familyId: opts.familyId,
    // backend aceita lista separada por vírgulas
    childIds: opts.childIds?.length ? opts.childIds.join(",") : undefined,
  });

  const data = await request<ReadingLite[]>(
    `/readings${qs.size ? `?${qs.toString()}` : ""}`
  );
  return asArray<ReadingLite>(data);
}

/**
 * Inicia uma leitura para uma criança (e, se aplicável, família).
 * Usa axios direto para enviar `withCredentials`.
 */
export async function startReading(
  childId: number,
  familyId: number | undefined,
  isbn: string
) {
  try {
    const qs = toParams({
      childId,
      familyId,
    }).toString();

    const { data } = await axios.post(
      `${API_URL}/readings/start?${qs}`,
      { isbn },
      { withCredentials: true }
    );
    return data; // { ok, reading }
  } catch (err: any) {
    return mapAxiosError(
      err,
      {
        "409:already_reading":
          "Já existe uma leitura em curso para este livro.",
        "404:book_not_found": "Livro não encontrado.",
      },
      "Não foi possível iniciar a leitura."
    );
  }
}

/**
 * Termina uma leitura (se existir leitura em curso para o ISBN/criança).
 */
export async function finishReading(
  childId: number,
  familyId: number | undefined,
  isbn: string
) {
  try {
    const qs = toParams({
      childId,
      familyId,
    }).toString();

    const { data } = await axios.post(
      `${API_URL}/readings/finish?${qs}`,
      { isbn },
      { withCredentials: true }
    );
    return data; // { ok, reading }
  } catch (err: any) {
    return mapAxiosError(
      err,
      {
        "404:no_open_reading": "Não há leitura em curso para este livro.",
      },
      "Não foi possível terminar a leitura."
    );
  }
}

/**
 * Lista leituras terminadas (com ou sem rating).
 * Filtra no cliente por `finishedAt`.
 */
export async function getLeiturasTerminadas(
  limit = 50,
  opts: { childId?: number; familyId?: number } = {}
): Promise<FinishedReading[]> {
  const qs = toParams({
    limit: safeLimit(limit, 50),
    childId: opts.childId,
    familyId: opts.familyId,
  });

  const data = await request<unknown[]>(`/readings?${qs.toString()}`);
  const arr = asArray<any>(data);
  return arr.filter((r) => !!r.finishedAt) as FinishedReading[];
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
