// src/services/ratings.ts
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

export async function saveRating(input: {
  isbn: string;
  stars: number;
  comment?: string;
  childId?: number;
  familyId?: number;
  /** opcional: força x-user-id no header */
  userIdHeader?: number;
}): Promise<{ ok: boolean }> {
  const { childId, familyId, userIdHeader, ...body } = input;

  const qs = new URLSearchParams();
  if (childId) qs.set("childId", String(childId));
  if (familyId) qs.set("familyId", String(familyId));

  const headers: Record<string, string> = {};
  const xUser = userIdHeader ?? familyId;
  if (xUser) headers["x-user-id"] = String(xUser);

  await request(`/ratings${qs.toString() ? `?${qs.toString()}` : ""}`, {
    method: "POST",
    json: body,
    headers,
  });
  return { ok: true };
}

export async function listPendingRatings(opts: {
  childId?: number;
  familyId?: number;
  limit?: number;
  userIdHeader?: number;
}) {
  const qs = new URLSearchParams();
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  if (opts.limit) qs.set("limit", String(opts.limit));

  const headers: Record<string, string> = {};
  const xUser = opts.userIdHeader ?? opts.familyId;
  if (xUser) headers["x-user-id"] = String(xUser);

  return request(`/ratings/pending?${qs.toString()}`, { headers });
}
