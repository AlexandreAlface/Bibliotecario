// apps/web/src/services/readings.ts
import { api } from "./https";

export type BookLite = {
  id: number;
  title: string;
  coverUrl?: string | null;
  date?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  childId?: number;
  childName?: string | null;
  stars?: number | null; // ⬅️ novo
  comment?: string | null; // ⬅️ novo
};

type GetOpts = { childId?: number; familyId?: number };

export async function getLeiturasAtuais(
  limit = 4,
  opts: GetOpts = {}
): Promise<BookLite[]> {
  const params: Record<string, any> = { limit };
  if (opts.childId) params.childId = opts.childId;
  if (opts.familyId) params.familyId = opts.familyId;

  // ⚠️ assume que `api` tem baseURL "/api"
  const { data } = await api.get("/readings", { params });
  const arr = Array.isArray(data) ? data : data?.items ?? [];

  return arr.map(
    (r: any): BookLite => ({
      id: Number(r.id ?? 0),
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
}

export async function startReading(
  isbn: string,
  ctx: { childId?: number; familyId?: number }
) {
  const params: Record<string, any> = {};
  if (ctx.childId) params.childId = ctx.childId;
  if (ctx.familyId) params.familyId = ctx.familyId;

  const { data } = await api.post("/readings/start", { isbn }, { params });
  return data as { ok: boolean; reading: any };
}

export async function finishReading(
  isbn: string,
  ctx: { childId?: number; familyId?: number }
) {
  const params: Record<string, any> = {};
  if (ctx.childId) params.childId = ctx.childId;
  if (ctx.familyId) params.familyId = ctx.familyId;

  const { data } = await api.post("/readings/finish", { isbn }, { params });
  return data as { ok: boolean; reading: any };
}

/* ---------- Avaliações ---------- */

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

export async function listPendingRatings(ctx: {
  childId?: number;
  familyId?: number;
  limit?: number;
}) {
  const params: Record<string, any> = {};
  if (ctx.childId) params.childId = ctx.childId;
  if (ctx.familyId) params.familyId = ctx.familyId;
  if (ctx.limit) params.limit = ctx.limit;

  const headers: Record<string, any> = {};
  if (ctx.familyId) headers["x-user-id"] = String(ctx.familyId); // <- em dev

  const { data } = await api.get("/ratings/pending", { params, headers });
  return data as PendingRating[];
}

export async function submitRating(
  payload: { isbn: string; stars: number; comment?: string },
  ctx: { childId?: number; familyId?: number }
) {
  // a API aceita childId/familyId no body
  const headers: Record<string, any> = {};
  if (ctx.familyId) headers["x-user-id"] = String(ctx.familyId); // <- em dev
  const { data } = await api.post(
    "/ratings",
    { ...payload, ...ctx },
    { headers }
  );
  return data as { ok: true; rating: any };
}
