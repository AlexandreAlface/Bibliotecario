/**
 * ============================================================================
 *  Módulo: src/services/families.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários claros (PT-PT) em TODO o código.
 *   • Helpers **PUROS** para criação de opções JSON (evita repetição).
 *   • Funções pequenas (≤ 30 linhas), coesas e fáceis de testar.
 *   • Tipagem explícita e alinhada com a API Express.
 * ============================================================================
 */

import { request } from "./api";

/* =============================== Tipos =============================== */

/** Género normalizado (inclui "O" de Outro e `null` para desconhecido). */
export type Gender = "M" | "F" | "O" | null;

/** Criança ligada a uma família. */
export type Child = {
  id: number;
  name: string;
  birthDate: string; // ISO (YYYY-MM-DD ou ISO full)
  gender?: Gender;
  readerProfile?: string | null;
};

/** Perfil do utilizador (família) devolvido por /auth/me. */
export type UserMe = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  children: Child[];
  // /auth/me poderá devolver chaves extra (roles, actingChild, ...).
  // O nosso `request` deve ignorar/permitir chaves adicionais.
};

/** Payload para atualizar dados básicos da família. */
export type UpdateMeInput = {
  fullName: string;
  phone?: string;
  address?: string;
};

/** Criar/atualizar criança (o backend aceita "O" em gender). */
export type ChildCreateInput = {
  name: string;
  birthDate: string; // ISO
  gender?: Gender;
  readerProfile?: string | null;
};
export type ChildUpdateInput = ChildCreateInput;

/* ============================ Helpers PUROS =========================== */

/**
 * Cria, de forma **pura**, as opções para pedidos JSON (POST/PATCH).
 * Evita repetição de `{ method, json }` e mantém cada chamada enxuta.
 */
function jsonOpts<M extends "POST" | "PATCH" | "DELETE" | "GET">(
  method: M,
  json?: unknown
): { method: M; json?: unknown } {
  return json === undefined ? { method } : { method, json };
}

/* ================================ API =================================
 * Endpoints (alinhados com as rotas Express do backend)
 * Cada função é curta, com responsabilidade única e sem efeitos colaterais.
 * =======================================================================
 */
export const familiesApi = {
  /** Informação do utilizador autenticado + crianças detalhadas.
   *  GET /api/auth/me
   */
  me: () => request<UserMe>("/auth/me", jsonOpts("GET")),

  /** Atualizar perfil do utilizador (família).
   *  PATCH /api/users/me
   */
  updateMe: (data: UpdateMeInput) =>
    request("/users/me", jsonOpts("PATCH", data)),

  /** Criar criança.
   *  POST /api/children
   */
  createChild: (data: ChildCreateInput) =>
    request("/children", jsonOpts("POST", data)),

  /** Atualizar criança.
   *  PATCH /api/children/:id
   */
  updateChild: (id: number, data: ChildUpdateInput) =>
    request(`/children/${id}`, jsonOpts("PATCH", data)),

  /** Apagar criança.
   *  DELETE /api/children/:id
   */
  deleteChild: (id: number) => request(`/children/${id}`, jsonOpts("DELETE")),
};

/* ============================== Fim ===================================
 *  Alexandre Brissos — Nº 21131
 * =======================================================================
 */
