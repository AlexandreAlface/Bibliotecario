// apps/mobile/src/services/readings.ts
import { request } from "./api"; // ⬅️ remove 'api'

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

// 🔹 PENDENTES (reservas / a ler) — já tinhas no meu patch anterior
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

export async function listPendingRatings(opts: {
  childId?: number;
  familyId?: number;
  limit?: number;
  userId?: number;   // vai na query (?userId=) para o backend juntar as estrelas do utilizador
}): Promise<PendingRatingRow[]> {
  const qs = new URLSearchParams();
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.userId) qs.set("userId", String(opts.userId));

  const data = await request<PendingRatingRow[]>(
    `/ratings/pending?${qs.toString()}`
  );
  return Array.isArray(data) ? data : [];
}

// 🔹 Leituras (histórico + em curso, vindo de /readings)
export async function getLeiturasAtuais(
  limit = 4,
  opts: Options = {}
): Promise<ReadingLite[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (opts.childId) params.childId = String(opts.childId);
  if (opts.childIds?.length) params.childIds = opts.childIds.join(",");
  if (opts.familyId) params.familyId = String(opts.familyId);

  const qs = new URLSearchParams(params).toString();
  const url = `/readings${qs ? `?${qs}` : ""}`;

  const data = await request<ReadingLite[]>(url); // ⬅️ era api(...)
  return Array.isArray(data) ? data : [];
}

export async function startReading(
  isbn: string,
  opts: { childId?: number; familyId?: number } = {}
) {
  const qs = new URLSearchParams();
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  return request(`/readings/start${qs.toString() ? `?${qs.toString()}` : ""}`, { // ⬅️ era api(...)
    method: "POST",
    json: { isbn },
  });
}

export async function finishReading(
  isbn: string,
  opts: { childId?: number; familyId?: number } = {}
) {
  const qs = new URLSearchParams();
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  return request(`/readings/finish${qs.toString() ? `?${qs.toString()}` : ""}`, { // ⬅️ era api(...)
    method: "POST",
    json: { isbn },
  });
}

export async function getLeiturasTerminadas(
  limit = 50,
  opts: { childId?: number; familyId?: number } = {}
): Promise<FinishedReading[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));

  const data = await request<any[]>(`/readings?${qs.toString()}`);
  const arr = Array.isArray(data) ? data : [];
  return arr.filter((r) => !!r.finishedAt);
}
