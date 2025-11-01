/**
 * =============================================================================
 *  Módulo: src/services/books.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers **PUROS** (normalização, querystring/limite).
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Evita o erro de export (usa `request` em vez de `api`).
 * =============================================================================
 */

import { request } from "./api";

/** Livro “leve” para listas/cards no mobile (home/leituras). */
export type BookLite = {
  id: string;            // ISBN (ou outro id string)
  title: string;
  author?: string;
  date?: string;         // usado em “Leituras atuais”
  coverUrl?: string | null;
};

/** Livro “leve” específico da pesquisa do bibliotecário. */
export type BookLiteLibrarian = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
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

export type BooksSearchResponseMobile = {
  items: BookLiteLibrarian[];
  total: number;
  page: number;
  perPage: number;
};

/* =========================== Helpers PUROS ============================ */

/** Garante um inteiro positivo razoável (1..50) para `limit`. */
function safeLimit(n: number, min = 1, max = 50): number {
  const x = Math.floor(Number.isFinite(n) ? n : min);
  return Math.min(Math.max(x, min), max);
}

/** Devolve `true` se for string não vazia. */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Aceita API a devolver `[]` ou `{ items: [] }` e normaliza para array. */
function normalizeList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray((payload as any).items)) return (payload as any).items;
  return [];
}

/** Normaliza item “qualquer” para BookLite (home/leituras). */
function toBookLite(raw: any, withDate = false): BookLite {
  const id =
    raw?.id ??
    raw?.isbn ??
    raw?.ISBN ??
    // fallback determinístico para evitar chaves repetidas em listas:
    String(Math.random());

  const date =
    withDate && isNonEmptyString(raw?.date)
      ? raw.date
      : withDate && isNonEmptyString(raw?.startedAt)
      ? raw.startedAt
      : undefined;

  return {
    id: String(id),
    title: String(raw?.title ?? "Sem título"),
    author: isNonEmptyString(raw?.author)
      ? raw.author
      : isNonEmptyString(raw?.autor)
      ? raw.autor
      : undefined,
    date,
    coverUrl:
      raw?.coverUrl === null
        ? null
        : isNonEmptyString(raw?.coverUrl)
        ? raw.coverUrl
        : null, // preferimos null a undefined no cover
  };
}

/** Normaliza item para BookLiteLibrarian (pesquisa bibliotecário). */
function toBookLiteLibrarian(raw: any): BookLiteLibrarian {
  return {
    isbn: String(raw?.isbn ?? raw?.id ?? ""),
    title: String(raw?.title ?? "Sem título"),
    coverUrl: raw?.coverUrl ?? null,
    summary: isNonEmptyString(raw?.summary) ? raw.summary : null,
  };
}

/** Constrói querystring a partir de objeto simples (ignora undefined/""). */
function qs(params: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ================================ API ================================= */

/**
 * Obtém “Leituras atuais” da família/utilizador.
 * Router esperado: **GET** `/books/current?limit=n`
 */
export async function getLeiturasAtuais(limit = 2): Promise<BookLite[]> {
  const rows = await request<unknown[]>(
    `/books/current?limit=${safeLimit(limit)}`
  );
  return normalizeList(rows).map((b) => toBookLite(b, true));
}

/**
 * Obtém sugestões de leitura para a home.
 * Router esperado: **GET** `/books/suggestions?limit=n`
 */
export async function getSugestoes(limit = 2): Promise<BookLite[]> {
  const rows = await request<unknown[]>(
    `/books/suggestions?limit=${safeLimit(limit)}`
  );
  return normalizeList(rows).map((b) => toBookLite(b, false));
}

/** Pesquisa rápida (home/auto-complete) — por título/autor/ISBN. */
export async function searchBooks(q: string, limit = 10): Promise<BookLite[]> {
  if (!q.trim()) return [];
  const tryPaths = [
    `/books/search?q=${encodeURIComponent(q)}&perPage=${limit}&page=1`,
    `/books?q=${encodeURIComponent(q)}&limit=${limit}`,
    `/public/books?q=${encodeURIComponent(q)}&limit=${limit}`,
  ];
  for (const p of tryPaths) {
    try {
      const out = await request<any>(p, { method: "GET" });
      const items = Array.isArray(out) ? out : out?.items ?? [];
      return (Array.isArray(items) ? items : []).map((b: any) => ({
        id: String(b?.isbn ?? b?.id ?? ""),
        title: String(b?.title ?? "Sem título"),
        author: b?.author ?? b?.autor ?? undefined,
        coverUrl: b?.coverUrl ?? null,
      }));
    } catch {}
  }
  return [];
}

/* ===================== NOVO — Pesquisa (Bibliotecário) ===================== */

/**
 * Pesquisa livros com filtros completos (texto/autor/categoria/ano/idade/biblioteca/paginação).
 * Router esperado: **GET** `/books/search?...`
 */
export async function searchBooksLibrarian(params: {
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
}): Promise<BooksSearchResponseMobile> {
  const path = `/books/search${qs(params)}`;
  const res = await request<any>(path, { method: "GET" });

  // API “canónica”: { items, total, page, perPage }
  if (res && Array.isArray(res.items)) {
    return {
      items: res.items.map(toBookLiteLibrarian),
      total: Number(res.total ?? res.items.length ?? 0),
      page: Number(res.page ?? params.page ?? 1),
      perPage: Number(res.perPage ?? params.perPage ?? 12),
    };
  }

  // Fallback: array simples
  const arr = Array.isArray(res) ? res : [];
  return {
    items: arr.map(toBookLiteLibrarian),
    total: arr.length,
    page: Number(params.page ?? 1),
    perPage: Number(params.perPage ?? 12),
  };
}

/**
 * Detalhe para bibliotecário (inclui holdings por biblioteca).
 * Router esperado: **GET** `/books/:isbn`
 */
export async function getBookDetailLibrarian(
  isbn: string
): Promise<BookDetailLibrarian> {
  const path = `/books/${encodeURIComponent(isbn)}`;
  const d = await request<BookDetailLibrarian>(path, { method: "GET" });
  // Garante arrays estáveis
  return {
    ...d,
    authors: Array.isArray(d?.authors)
      ? d!.authors
      : isNonEmptyString((d as any)?.authors)
      ? String((d as any).authors).split(/\s*,\s*/)
      : [],
    categories: Array.isArray(d?.categories)
      ? d!.categories
      : isNonEmptyString((d as any)?.categories)
      ? String((d as any).categories).split(/\s*,\s*/)
      : [],
    holdings: Array.isArray(d?.holdings) ? d!.holdings : [],
  };
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
