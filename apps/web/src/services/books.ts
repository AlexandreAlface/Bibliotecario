import { api } from "./https";

export type BookLite = {
  id?: string | number;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null; // 👈 novo
  score?: number;
  why?: string[];
};

export type QuizAnswer = { id: string; value: any };

export type PaginatedBooks = { items: BookLite[]; total: number };

export async function getSugestoesPerfil(
  perPage = 12,
  who?: { childId?: number; familyId?: number; page?: number }
): Promise<PaginatedBooks> {
  const qs = new URLSearchParams({
    perPage: String(perPage),
    page: String(who?.page ?? 1),
  });
  if (who?.childId) qs.set("childId", String(who.childId));
  if (who?.familyId) qs.set("familyId", String(who.familyId));

  const { data } = await api.get<PaginatedBooks>(
    `/recommendations/profile?${qs.toString()}`,
    { withCredentials: true }
  );
  return data;
}

export async function getSugestoesQuiz(
  answers: QuizAnswer[],
  perPage = 12,
  who?: { childId?: number; familyId?: number; page?: number }
): Promise<PaginatedBooks> {
  const qs = new URLSearchParams({
    perPage: String(perPage),
    page: String(who?.page ?? 1),
  });
  if (who?.childId) qs.set("childId", String(who.childId));
  if (who?.familyId) qs.set("familyId", String(who.familyId));

  const { data } = await api.post<PaginatedBooks>(
    `/recommendations/quiz?${qs.toString()}`,
    { answers }
  );
  return data;
}
