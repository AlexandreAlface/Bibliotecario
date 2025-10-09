/**
 * ============================================================================
 *  Módulo: src/services/recommendations
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários em PT-PT e identificação de **métodos PUROS**.
 *   • Funções pequenas (≤ 30 linhas), coesas e tipadas.
 *   • Normalização robusta da resposta da API (aceita varias formas).
 * ============================================================================
 */

import { request } from "./api";

/* =============================== Tipos =============================== */

/** Resposta mínima de um livro para recomendações. */
export type BookLite = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null; // descrição/sinopse (pode vir nula)
  score?: number;
  why?: string[]; // razões da recomendação (explicabilidade)
  status?: "none" | "reserved" | "reading" | "finished";
  lastFinished?: string | null; // ISO
};

export type QuizAnswer = {
  id: string;
  value: unknown; // valor livre (string | number | string[] …)
};

/* ============================ Helpers PUROS =========================== */

/** 🔹 **PURO**: cria querystring ignorando valores vazios/indefinidos. */
function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * 🔹 **PURO**: normaliza a resposta da API para `BookLite[]`, aceitando
 * diferentes envelopes (`[]`, `{ data: [] }`, `{ items: [] }`).
 */
function normalize(payload: unknown): BookLite[] {
  const pick = (x: any): any[] =>
    Array.isArray(x)
      ? x
      : Array.isArray(x?.data)
      ? x.data
      : Array.isArray(x?.items)
      ? x.items
      : [];

  // Molda os campos essenciais para reforçar o contrato no consumidor
  return pick(payload).map((b: any) => ({
    isbn: String(b?.isbn ?? ""),
    title: String(b?.title ?? "—"),
    coverUrl: b?.coverUrl ?? null,
    summary: b?.summary ?? null,
    score: typeof b?.score === "number" ? b.score : undefined,
    why: Array.isArray(b?.why)
      ? b.why.filter((w: any) => typeof w === "string")
      : undefined,
    status: (["none", "reserved", "reading", "finished"] as const).includes(
      b?.status
    )
      ? b.status
      : undefined,
    lastFinished: typeof b?.lastFinished === "string" ? b.lastFinished : null,
  })) as BookLite[];
}

/* ================================ API ================================= */

/**
 * Sugestões geradas a partir do **perfil** (histórico / preferências).
 * Escopo opcional por `childId` ou `familyId`.
 */
export async function getSugestoesPerfil(
  limit = 12,
  opts: { childId?: number; familyId?: number } = {}
): Promise<BookLite[]> {
  const safeLimit = Math.max(1, Number(limit) || 12);
  const url = `/recommendations/profile${toQuery({
    limit: safeLimit,
    childId: opts.childId,
    familyId: opts.familyId,
  })}`;

  const data = await request(url, { method: "GET" });
  return normalize(data);
}

/**
 * Sugestões geradas a partir de um **quiz** (respostas ad hoc).
 * As respostas são enviadas no corpo da requisição.
 */
export async function getSugestoesQuiz(
  answers: QuizAnswer[],
  limit = 12,
  opts: { childId?: number; familyId?: number } = {}
): Promise<BookLite[]> {
  const safeLimit = Math.max(1, Number(limit) || 12);
  const url = `/recommendations/quiz${toQuery({
    limit: safeLimit,
    childId: opts.childId,
    familyId: opts.familyId,
  })}`;

  const data = await request(url, {
    method: "POST",
    json: { answers: Array.isArray(answers) ? answers : [] },
  });
  return normalize(data);
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
