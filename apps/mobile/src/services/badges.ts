/**
 * =============================================================================
 *  Módulo: src/services/badges.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers **PUROS** (query-string, sane defaults).
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita e tolerante a payloads do backend.
 * =============================================================================
 */

import { request } from "./api";

/** Selo/Troféu disponível no catálogo. */
export type Badge = {
  id: number;
  name: string;
  type: string;               // ex.: "SELO" | "TROFÉU"
  criteria?: string | null;   // regra/descrição (opcional)
};

/** Atribuição de badge a uma criança. */
export type BadgeAssignment = {
  id: string;                 // formato sugerido: `${childId}_${badgeId}`
  childId: number;
  childName?: string | null;
  badgeId: number;
  name?: string | null;       // nome do badge (denormalizado)
  type?: string | null;       // tipo do badge (denormalizado)
  criteria?: string | null;
  assignedAt?: string | null; // ISO
};

/* =========================== Helpers PUROS ============================ */

/** Gera query-string ignorando nulos/vazios e aceitando arrays. */
function toQuery(params: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      for (const item of v) {
        pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
      }
    } else {
      const sv = String(v);
      if (sv === "") continue;
      pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(sv)}`);
    }
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
}

/** Limita `limit` a um intervalo razoável (1..200). */
function safeLimit(n: unknown, min = 1, max = 200): number {
  const x = Math.floor(Number(n));
  return Number.isFinite(x) ? Math.min(Math.max(x, min), max) : min;
}

/* ================================ API ================================= */

/**
 * Endpoints de badges (catálogo e atribuições).
 * Todas as funções devolvem promessas tipadas e **não têm efeitos colaterais**.
 */
export const badgesApi = {
  /**
   * Lista o catálogo de badges (todos os selos/troféus).
   * GET /badges
   */
  listCatalog: () =>
    request<Badge[]>("/badges", { method: "GET" }),

  /**
   * Lista atribuições de badges (por família/criança[s]).
   * GET /badge-assignments?familyId=&childId=&childIds=&limit=
   */
  assignments: (params: {
    familyId?: number;
    childId?: number;
    childIds?: number[];
    limit?: number;
  }) => {
    const query = toQuery({
      familyId: params.familyId,
      childId: params.childId,
      childIds: params.childIds?.length ? [params.childIds.join(",")] : undefined, // backend espera CSV
      limit: safeLimit(params.limit ?? 50),
    });
    return request<BadgeAssignment[]>(`/badge-assignments${query}`, { method: "GET" });
  },
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
