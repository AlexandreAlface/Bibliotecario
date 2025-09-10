// src/services/ratings.ts
import { API_URL, request } from "./api";
import axios from "axios";

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
  familyId?: number; // envia sempre o familyId mesmo em child mode
}) {
  try {
    const { data } = await axios.post(`${API_URL}/ratings`, input, { withCredentials: true });
    return data; // { ok, rating }
  } catch (err: any) {
    if (err?.response?.data?.error === "reading_not_finished") {
      throw new Error("Só podes avaliar depois de terminar a leitura.");
    }
    throw new Error("Não foi possível guardar a avaliação.");
  }
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
