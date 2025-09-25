// src/services/recommendations.ts
import { request } from "./api";

export type QuizAnswer = { id: string; value: any };

export type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null; // <- agora também pode vir a descrição
  score?: number;
  why?: string[];
  status?: "none" | "reserved" | "reading" | "finished";
  lastFinished?: string | null;
};

function normalize(payload: any): BookLite[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export async function getSugestoesPerfil(
  limit = 12,
  opts: { childId?: number; familyId?: number } = {}
): Promise<BookLite[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  const data = await request(`/recommendations/profile?${qs.toString()}`, {
    method: "GET",
  });
  return normalize(data);
}

export async function getSugestoesQuiz(
  answers: QuizAnswer[],
  limit = 12,
  opts: { childId?: number; familyId?: number } = {}
): Promise<BookLite[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  const data = await request(`/recommendations/quiz?${qs.toString()}`, {
    method: "POST",
    json: { answers },
  });
  return normalize(data);
}
