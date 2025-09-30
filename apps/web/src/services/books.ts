// apps/web/src/services/books.ts
import { api } from "./https";

export type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
  score?: number;
  why?: string[];
};

export type BookDetails = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
  authors?: string[] | string | null;
  categories?: string[] | string | null;
  genres?: string[] | string | null;
  publicationYear?: number | null;
  ageRange?: string | null;
};

export type BookDetailLibrarian = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
  publicationYear?: number | null;
  ageRange?: string | null;
  authors?: string[];
  categories?: string[];
  holdings?: {
    libraryId: number;
    libraryName: string;
    quantity: number | null;
    shelfCode: string | null;
    accessionNo: string | null;
  }[];
};

export type BooksSearchResponse = {
  items: BookLite[];
  total: number;
  page: number;
  perPage: number;
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

export async function searchBooks(params: {
  q?: string;
  author?: string;
  category?: string;
  yearFrom?: number;
  yearTo?: number;
  ageMin?: number;
  ageMax?: number;
  libraryId?: number;
  inLibrary?: boolean;
  page?: number;
  perPage?: number;
}): Promise<BooksSearchResponse> {
  const { data } = await api.get("/books/search", { params });
  return data as BooksSearchResponse;
}

export async function getBookDetailLibrarian(isbn: string): Promise<BookDetailLibrarian> {
  const { data } = await api.get(`/books/${encodeURIComponent(isbn)}`);
  return data as BookDetailLibrarian;
}

export async function getBookByIsbn(isbn: string): Promise<BookDetails> {
  try {
    const { data } = await api.get(`/books/${encodeURIComponent(isbn)}`);
    return data as BookDetails;
  } catch (e1) {
    // fallback simples (se tiveres busca por querystring)
    try {
      const { data } = await api.get(`/books`, { params: { isbn } });
      return (Array.isArray(data) ? data[0] : data) as BookDetails;
    } catch (e2) {
      // devolve estrutura mínima para o modal não falhar
      return { isbn, title: "Livro", summary: null };
    }
  }
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
  if (who?.familyId) qs.set("familyId", String(who.familyId)); // ok se o backend ignorar

  try {
    const { data } = await api.get(`/recommendations/profile?${qs.toString()}`, {
      withCredentials: true,
    });

    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const items: BookLite[] = rawItems.map((r: any) => ({
      id: r.id ?? r.isbn,
      isbn: r.isbn,
      title: r.title ?? "Livro",
      coverUrl: r.coverUrl ?? null,
      summary: r.summary ?? null,
      score: typeof r.score === "number" ? r.score : undefined,
      why: Array.isArray(r.why) ? r.why : [],
    }));

    return { items, total: Number(data?.total ?? items.length) };
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
