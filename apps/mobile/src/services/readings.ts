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
 *   • ✅ Preserva startedAt/finishedAt (histórico).
 *   • 🪵 Logs de debug para inspeção do tráfego (apagar depois).
 *   • 🛠️ Fix: NÃO usar `URLSearchParams.size` (inexistente no RN). Usar `toString()`.
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
  /** Data “principal” (finishedAt || startedAt) já calculada no backend */
  date?: string | null;
  /** ✅ Campos necessários para distinguir reading vs finished no cliente */
  startedAt?: string | null;
  finishedAt?: string | null;
  /** (opcional) última avaliação agregada à leitura */
  stars?: number | null;
  comment?: string | null;
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

/** 🔹 **PURO**: normaliza um item vindo do backend para `ReadingLite`. */
function normalizeReading(item: any): ReadingLite {
  const id = Number(item?.id ?? 0);
  const childId = Number(item?.childId ?? 0);
  const startedAt =
    item?.startedAt == null || item?.startedAt === ""
      ? null
      : String(item.startedAt);
  const finishedAt =
    item?.finishedAt == null || item?.finishedAt === ""
      ? null
      : String(item.finishedAt);

  return {
    id,
    childId,
    childName: item?.childName ?? null,
    isbn: String(item?.isbn ?? ""),
    title: item?.title ?? "Livro",
    coverUrl: item?.coverUrl ?? null,
    // o backend já envia `date`, mas garantimos fallback
    date: item?.date ?? finishedAt ?? startedAt ?? null,
    startedAt,
    finishedAt,
    stars:
      item?.stars !== undefined && item?.stars !== null
        ? Number(item.stars)
        : null,
    comment: item?.comment ?? null,
  };
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
  const url = `/ratings/pending?${qs.toString()}`;
  // 🪵 debug
  if (__DEV__) console.debug("[API] GET", url);
  const data = await request<PendingRatingRow[]>(url);
  return asArray<PendingRatingRow>(data);
}

/**
 * Leituras atuais (histórico recente + em curso) vindas de `/readings`.
 * Aceita filtros por criança(s) e/ou família.
 *
 * ⚠️ Importante: normalizamos manualmente para não perder campos.
 */
export async function getLeiturasAtuais(
  limit = 4,
  opts: Options = {}
): Promise<ReadingLite[]> {
  // ⚠️ Se vier sem childId e sem familyId, o backend devolve []
  if (!opts.childId && !opts.familyId && !opts.childIds?.length) {
    if (__DEV__)
      console.warn("[API] getLeiturasAtuais sem childId/familyId → []");
  }

  const qs = toParams({
    limit: safeLimit(limit, 4),
    childId: opts.childId, // passamos SEMPRE se existir
    familyId: opts.familyId, // idem
    childIds: opts.childIds?.length ? opts.childIds.join(",") : undefined,
  });

  // 🛠️ `URLSearchParams` não tem `.size` no RN → usar toString() para decidir
  const qstr = qs.toString();
  const url = `/readings${qstr ? `?${qstr}` : ""}`;

  // 🪵 debug
  if (__DEV__) console.debug("[API] GET", url);

  const raw = await request<unknown[]>(url);
  const arr = asArray<any>(raw).map(normalizeReading);

  // 🪵 debug
  if (__DEV__) {
    const sample = arr[0];
    console.debug(
      `[API] /readings → ${arr.length} items`,
      sample ? { sample } : ""
    );
  }

  return arr;
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
    const qs = toParams({ childId, familyId }).toString();
    const url = `${API_URL}/readings/start?${qs}`;
    // 🪵 debug
    if (__DEV__) console.debug("[API] POST", url, { isbn });
    const { data } = await axios.post(url, { isbn }, { withCredentials: true });
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
    const qs = toParams({ childId, familyId }).toString();
    const url = `${API_URL}/readings/finish?${qs}`;
    // 🪵 debug
    if (__DEV__) console.debug("[API] POST", url, { isbn });
    const { data } = await axios.post(url, { isbn }, { withCredentials: true });
    return data; // { ok, reading }
  } catch (err: any) {
    return mapAxiosError(
      err,
      { "404:no_open_reading": "Não há leitura em curso para este livro." },
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

  // Mesma correção do getLeiturasAtuais
  const qstr = qs.toString();
  const url = `/readings${qstr ? `?${qstr}` : ""}`;

  // 🪵 debug
  if (__DEV__) console.debug("[API] GET", url);

  const raw = await request<unknown[]>(url);
  const arr = asArray<any>(raw).map(normalizeReading);
  return arr.filter((r) => !!r.finishedAt) as FinishedReading[];
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
