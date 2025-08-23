// apps/web/src/services/books.ts
import { api } from "./https";

export type BookLite = {
  id?: string | number;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  score?: number;
  why?: string[];
};

export type QuizAnswer = { id: string; value: any };

export async function getSugestoesPerfil(
  limit = 6,
  who?: { childId?: number; familyId?: number }
): Promise<BookLite[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (who?.childId) qs.set("childId", String(who.childId));
  if (who?.familyId) qs.set("familyId", String(who.familyId));

  // novo endpoint, sem body (GET)
  const { data } = await api.get<BookLite[]>(
    `/recommendations/profile?${qs.toString()}`,
    { withCredentials: true }
  );
  return data;
  
}

export async function getSugestoesQuiz(
  answers: QuizAnswer[],
  limit = 12,
  who?: { childId?: number; familyId?: number }
) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (who?.childId) qs.set("childId", String(who.childId));
  if (who?.familyId) qs.set("familyId", String(who.familyId));

  // IMPORTANTE: Axios usa "data", não "body"
  return api(`/recommendations/quiz?${qs}`, {
    method: "POST",
    data: { answers },
  });
}


