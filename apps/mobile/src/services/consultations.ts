/**
 * =============================================================================
 *  Módulo: src/services/consultations.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários e JSDoc detalhados (PT-PT).
 *   • Helpers **PUROS** (toQuery) — sem efeitos laterais.
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita e retorno tipado em todas as chamadas.
 * =============================================================================
 */

import { request } from "./api";

/** Consulta “light” para listagens no mobile. */
export type ConsultationLite = {
  id: number;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  childName?: string | null;
  librarianName?: string | null;
  libraryName?: string | null;
};

/** Slot de marcação de consulta. */
export type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "CANCELLED";
  librarianId: number;
  librarianName?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  librarianAvatarUrl?: string | null;
};

/* ============================== Helpers PUROS =============================== */

/**
 * Constrói query-string ignorando chaves indefinidas/nulas/vazias.
 * Suporta arrays (repete o mesmo parâmetro p/ cada valor).
 */
function toQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || String(v) === "") continue;
    if (Array.isArray(v)) {
      for (const vv of v) {
        if (vv === undefined || vv === null || String(vv) === "") continue;
        parts.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(String(vv))}`
        );
      }
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ================================= API ===================================== */

export const consultationsApi = {
  /**
   * Lista **todas** as consultas visíveis para o utilizador (família/criança),
   * opcionalmente filtradas por estado, intervalo temporal, bibliotecário, etc.
   *
   * @param params Filtros e paginação (no servidor).
   * @returns Array de consultas leves.
   */
  listAll: (params: {
    familyId?: number;
    childId?: number;
    status?: string;
    from?: string;
    to?: string;
    order?: "asc" | "desc";
    limit?: number;
    librarianId?: number;
  }) =>
    request<ConsultationLite[]>(`/consultations/all${toQuery(params)}`, {
      method: "GET",
    }),

  /**
   * Procura slots **marcáveis** no intervalo (força `onlyBookable=true`),
   * com filtros opcionais por bibliotecário e biblioteca.
   *
   * @param params Intervalo obrigatório `from`/`to` (ISO), e filtros extra.
   * @returns Lista de slots disponíveis/visíveis no período.
   */
  searchSlots: (params: {
    from: string;
    to: string;
    librarianId?: number;
    libraryId?: number;
  }) =>
    request<Slot[]>(
      `/consultations/slots${toQuery({ ...params, onlyBookable: true })}`,
      { method: "GET" }
    ),

  /**
   * Obtém os slots de um bibliotecário específico num intervalo.
   *
   * @param librarianId ID do bibliotecário.
   * @param params Intervalo `from`/`to` (ISO).
   * @returns Lista de slots desse bibliotecário.
   */
  slotsByLibrarian: (
    librarianId: number,
    params: { from: string; to: string }
  ) =>
    request<Slot[]>(
      `/consultations/librarians/${librarianId}/slots${toQuery({
        from: params.from,
        to: params.to,
      })}`,
      { method: "GET" }
    ),

  /**
   * Cria uma consulta a partir de um slot existente.
   *
   * @param data Identificadores da família, criança, slot e bibliotecário.
   * @returns Resposta do backend (normalizada pelo `request`).
   */
  create: (data: {
    familyId: number;
    childId: number;
    slotId: number;
    librarianId: number;
  }) => request("/consultations", { method: "POST", json: data }),
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
