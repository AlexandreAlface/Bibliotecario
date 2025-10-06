/**
 * ============================================================================
 *  Módulo: usersApi (mobile)
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários em PT-PT e anotações de métodos **PUROS**.
 *   • Funções curtas (≤ 30 linhas) e coesas.
 *   • Tipagem explícita do retorno (Promise<...>) e dos parâmetros.
 * ============================================================================
 */

import { request } from "./api";

/** Utilizador simples (id + nome) devolvido pela API. */
export type SimpleUser = { id: number; name: string };

/* ========================= Helpers de querystring ========================= */

/**
 * 🔹 **PURO**: verifica se um valor é "vazio" para query (undefined/null/"").
 */
function isNilOrEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

/**
 * 🔹 **PURO**: normaliza valores para string na query.
 * - Date → ISO
 * - boolean/number → String(v)
 * - outros → String(v)
 */
function qString(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * 🔹 **PURO** (≤ 30 linhas)
 * Constrói a querystring a partir de um objeto:
 * - Ignora chaves com valores vazios (undefined/null/"").
 * - Arrays geram pares repetidos (?k=a&k=b).
 * - Escapa chave e valor com encodeURIComponent.
 */
function toQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params ?? {})) {
    if (isNilOrEmpty(v)) continue;
    const key = encodeURIComponent(k);
    if (Array.isArray(v)) {
      for (const it of v) {
        if (isNilOrEmpty(it)) continue;
        parts.push(`${key}=${encodeURIComponent(qString(it))}`);
      }
    } else {
      parts.push(`${key}=${encodeURIComponent(qString(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ================================ API ===================================== */

export const usersApi = {
  /**
   * Lista bibliotecários (opcionalmente filtrado por biblioteca).
   * @param params.libraryId ID da biblioteca para filtrar (opcional).
   */
  listLibrarians: (params?: { libraryId?: number }): Promise<SimpleUser[]> =>
    request<SimpleUser[]>(`/consultations/librarians${toQuery(params ?? {})}`, {
      method: "GET",
    }),

  /**
   * Lista bibliotecários com slots abertos num intervalo.
   * @param params.from ISO string (inclusive).
   * @param params.to   ISO string (inclusive).
   * @param params.libraryId ID da biblioteca (opcional).
   */
  listLibrariansWithOpenSlots: (params: {
    from: string;
    to: string;
    libraryId?: number;
  }): Promise<SimpleUser[]> =>
    request<SimpleUser[]>(
      `/consultations/librarians/with-open-slots${toQuery(params)}`,
      { method: "GET" }
    ),
};

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
