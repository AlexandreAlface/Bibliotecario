/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de leituras (atuais, iniciar, terminar) e avaliações.
 *            Usa o cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { api, http } from "./https";

/* ---------- Tipos ---------- */

export type BookLite = {
  id: number;
  isbn?: string; // devolvido pela API
  title: string;
  coverUrl?: string | null;
  date?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  childId?: number;
  childName?: string | null;
  stars?: number | null;
  comment?: string | null;
};

type GetOpts = { childId?: number; familyId?: number };

export type StartFinishResult = { ok: boolean; reading: any };

export type PendingRating = {
  reservationId: number;
  readingId: number | null;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  status: "reserved" | "reading" | "finished";
  startedAt?: string | null;
  finishedAt?: string | null;
  stars: number | null; // do utilizador atual
  comment?: string | null;
  ratedAt?: string | null;
};

/* ---------- Helpers ---------- */

/** Constrói objeto de params ignorando undefined. */
function paramsOf(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) if (v !== undefined) out[k] = v;
  return out;
}

/** Normaliza um item de leitura em BookLite. */
function normalizeReading(r: any): BookLite {
  return {
    id: Number(r?.id ?? 0),
    isbn: r?.isbn ?? undefined,
    title: String(r?.title ?? "Livro"),
    coverUrl: r?.coverUrl ?? null,
    date: r?.date ?? null,
    startedAt: r?.startedAt ?? null,
    finishedAt: r?.finishedAt ?? null,
    childId: r?.childId,
    childName: r?.childName ?? null,
    stars: r?.stars ?? null,
    comment: r?.comment ?? null,
  };
}

/* ---------- Leituras ---------- */

/**
 * Lista leituras atuais (limit default=4). Aceita childId e/ou familyId.
 */
export async function getLeiturasAtuais(
  limit = 4,
  opts: GetOpts = {}
): Promise<BookLite[]> {
  try {
    const params: Record<string, any> = { limit };
    if (opts.childId) params.childId = opts.childId;
    if (opts.familyId) params.familyId = opts.familyId;

    const { data } = await api.get("/readings", { params });
    const arr = Array.isArray(data) ? data : data?.items ?? [];
    return arr.map(
      (r: any): BookLite => ({
        id: Number(r.id ?? 0),
        isbn: r.isbn ?? undefined,
        title: r.title ?? "Livro",
        coverUrl: r.coverUrl ?? null,
        date: r.date ?? null,
        startedAt: r.startedAt ?? null,
        finishedAt: r.finishedAt ?? null,
        childId: r.childId,
        childName: r.childName ?? null,
        stars: r.stars ?? null,
        comment: r.comment ?? null,
      })
    );
  } catch {
    // ✅ nunca propaga shape estranho
    return [];
  }
}

/**
 * Inicia uma leitura para um ISBN.
 */
export async function startReading(
  isbn: string,
  ctx: { childId?: number; familyId?: number }
): Promise<StartFinishResult> {
  return http<StartFinishResult>({
    url: "/readings/start",
    method: "POST",
    data: { isbn },
    params: paramsOf({ childId: ctx.childId, familyId: ctx.familyId }),
  });
}

/**
 * Termina uma leitura para um ISBN.
 */
export async function finishReading(
  isbn: string,
  ctx: { childId?: number; familyId?: number }
): Promise<StartFinishResult> {
  return http<StartFinishResult>({
    url: "/readings/finish",
    method: "POST",
    data: { isbn },
    params: paramsOf({ childId: ctx.childId, familyId: ctx.familyId }),
  });
}

/* ---------- Avaliações ---------- */

/**
 * Lista itens pendentes de avaliação (com filtros opcionais).
 */
export async function listPendingRatings(ctx: {
  childId?: number;
  familyId?: number;
  limit?: number;
}): Promise<PendingRating[]> {
  const headers: Record<string, string> = {};
  if (ctx.familyId !== undefined) headers["x-user-id"] = String(ctx.familyId); // dev

  return http<PendingRating[]>({
    url: "/ratings/pending",
    method: "GET",
    params: paramsOf({
      childId: ctx.childId,
      familyId: ctx.familyId,
      limit: ctx.limit,
    }),
    headers,
  });
}

/**
 * Submete avaliação (stars/comment) para um ISBN.
 * A API aceita childId/familyId no body.
 */
export async function submitRating(
  payload: { isbn: string; stars: number; comment?: string },
  ctx: { childId?: number; familyId?: number }
): Promise<{ ok: true; rating: any }> {
  const headers: Record<string, string> = {};
  if (ctx.familyId !== undefined) headers["x-user-id"] = String(ctx.familyId); // dev

  return http<{ ok: true; rating: any }>({
    url: "/ratings",
    method: "POST",
    data: { ...payload, ...ctx },
    headers,
  });
}
