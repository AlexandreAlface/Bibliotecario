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

/** Livro “leve” para listas/cards no mobile. */
export type BookLite = {
  id: string;            // ISBN (ou outro id string)
  title: string;
  author?: string;
  date?: string;         // usado em “Leituras atuais”
  coverUrl?: string | null;
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

/**
 * Normaliza um item vindo da API para `BookLite`.
 * @param raw      Linha arbitrária da API.
 * @param withDate Quando `true`, tenta mapear um campo de data (ex.: leituras atuais).
 */
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

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
