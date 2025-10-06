/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de livros (search, detalhe e recomendações por perfil/quiz).
 *            Usa o cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { http, asApiError, isApiError } from "./https";

/* ---------- Tipos ---------- */

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

/* ---------- API ---------- */

/** Pesquisa livros (texto/autor/categoria/ano/idade/biblioteca/paginação). */
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
  return http<BooksSearchResponse>({
    url: "/books/search",
    method: "GET",
    params,
  });
}

/** Detalhe para bibliotecário (inclui holdings por biblioteca). */
export async function getBookDetailLibrarian(
  isbn: string
): Promise<BookDetailLibrarian> {
  return http<BookDetailLibrarian>({
    url: `/books/${encodeURIComponent(isbn)}`,
    method: "GET",
  });
}

/**
 * Lê um livro por ISBN com fallback para `/books?isbn=...`.
 * Se ambos falharem, devolve estrutura mínima para não partir a UI.
 */
export async function getBookByIsbn(isbn: string): Promise<BookDetails> {
  try {
    return await http<BookDetails>({
      url: `/books/${encodeURIComponent(isbn)}`,
      method: "GET",
    });
  } catch (e1) {
    try {
      const res = await http<BookDetails | BookDetails[]>({
        url: "/books",
        method: "GET",
        params: { isbn },
      });
      return (
        (Array.isArray(res) ? res[0] : res) ?? {
          isbn,
          title: "Livro",
          summary: null,
        }
      );
    } catch (e2) {
      return { isbn, title: "Livro", summary: null };
    }
  }
}

/* ---------- Recomendações ---------- */

/** Recomendações baseadas no perfil (vetor/idade/leitura). */
export async function getSugestoesPerfil(
  perPage = 12,
  who?: { childId?: number; familyId?: number; page?: number }
): Promise<PaginatedBooks> {
  try {
    const data = await http<{ items: any[]; total?: number }>({
      url: "/recommendations/profile",
      method: "GET",
      params: {
        perPage,
        page: who?.page ?? 1,
        childId: who?.childId,
        familyId: who?.familyId,
      },
    });

    const items: BookLite[] = (
      Array.isArray(data?.items) ? data.items : []
    ).map((r: any) => ({
      isbn: r?.isbn,
      title: r?.title ?? "Livro",
      coverUrl: r?.coverUrl ?? null,
      summary: r?.summary ?? null,
      score: typeof r?.score === "number" ? r.score : undefined,
      why: Array.isArray(r?.why) ? r.why : [],
    }));

    return { items, total: Number(data?.total ?? items.length) };
  } catch (e: any) {
    throw isApiError(e) ? e : asApiError(e);
  }
}

/** Recomendações baseadas no quiz (POST com respostas). */
export async function getSugestoesQuiz(
  answers: QuizAnswer[],
  perPage = 12,
  who?: { childId?: number; familyId?: number; page?: number }
): Promise<PaginatedBooks> {
  try {
    return await http<PaginatedBooks>({
      url: "/recommendations/quiz",
      method: "POST",
      params: {
        perPage,
        page: who?.page ?? 1,
        childId: who?.childId,
        familyId: who?.familyId,
      },
      data: { answers },
    });
  } catch (e: any) {
    throw isApiError(e) ? e : asApiError(e);
  }
}
