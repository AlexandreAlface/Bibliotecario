// apps/mobile/src/services/ratings.ts
import { request } from "./api";

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

export async function getPendingRatings(
  limit = 10,
  opts: { childId?: number; familyId?: number } = {}
): Promise<PendingRating[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  const data = await request<PendingRating[]>(
    `/ratings/pending?${qs.toString()}`
  );
  return Array.isArray(data) ? data : [];
}

export async function saveRating(input: {
  isbn: string;
  stars: number;
  comment?: string;
  childId?: number; // ← vai no BODY
  familyId?: number; // ← pode ir no BODY (ou query, mas body já chega)
  userId?: number; // ← vai na QUERY ou header
}): Promise<{ ok: boolean }> {
  const { userId, ...body } = input;

  // só userId na query (backend aceita ?userId= ou header x-user-id)
  const qs = new URLSearchParams();
  if (userId) qs.set("userId", String(userId));

  await request(`/ratings${qs.toString() ? `?${qs.toString()}` : ""}`, {
    method: "POST",
    json: body, // 👈 AQUI: childId/familyId seguem no body
  });
  return { ok: true };
}
// opcional: alias semântico
export const updateRating = saveRating;
