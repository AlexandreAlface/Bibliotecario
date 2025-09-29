// apps/web/src/services/books.ts
import { api } from "./https";

export type BookLite = {
  id?: string | number;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
  score?: number;
  why?: string[]; // explicações (opcional)
};

export type QuizAnswer = { id: string; value: any };

export type PaginatedBooks = { items: BookLite[]; total: number };

class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parseAxiosError(e: any): ApiError {
  const status = e?.response?.status ?? 0;
  const data = e?.response?.data ?? {};
  const code = data?.error ?? e?.code ?? "unknown_error";
  const msg =
    data?.message ??
    data?.details ??
    e?.message ??
    "Falha a comunicar com o servidor";
  // útil em dev
  console.error("[API ERROR]", { status, code, data });
  return new ApiError(status, msg, code, data);
}

/**
 * Recomendações baseadas no perfil (vetor/idade/leitura).
 * GET /recommendations/profile
 */
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

  try {
    const { data } = await api.get<PaginatedBooks>(
      `/recommendations/profile?${qs.toString()}`,
      { withCredentials: true }
    );
    return data;
  } catch (e: any) {
    throw parseAxiosError(e);
  }
}

/**
 * Recomendações baseadas no quiz.
 * POST /recommendations/quiz
 */
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

  try {
    const { data } = await api.post<PaginatedBooks>(
      `/recommendations/quiz?${qs.toString()}`,
      { answers },
      { withCredentials: true }
    );
    return data;
  } catch (e: any) {
    throw parseAxiosError(e);
  }
}
