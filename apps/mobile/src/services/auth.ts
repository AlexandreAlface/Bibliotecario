/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/auth.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT) em todo o código.
 *   • Helpers **PUROS** e reutilizáveis (safe JSON, fallback de rotas).
 *   • Funções curtas (≤ 30 linhas), coesas e testáveis.
 *   • Tipagem explícita e manuseio de erros consistente.
 * =============================================================================
 */

import Constants from "expo-constants";

/** URL base do backend (Expo → extra.API_URL, env → EXPO_PUBLIC_API_URL, fallback local). */
const API_URL: string =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3333/api";

/** Extensão de RequestInit que permite enviar `json` (serializado automaticamente). */
type FetchInit = RequestInit & { json?: unknown };

/* =========================== Helpers PUROS ============================ */

/** Faz parse “seguro” do JSON devolvendo `null` quando vazio/malformado. */
function safeJson(text: string): any {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Requisição genérica com `fetch`:
 * - Envia `json` quando presente (Content-Type: application/json).
 * - Inclui cookies (`credentials: "include"`).
 * - Lança erro com `status` e mensagem amigável quando `!res.ok`.
 */
async function request<T = any>(path: string, init: FetchInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: json ? JSON.stringify(json) : (rest as any).body,
    ...rest,
  });

  const data = safeJson(await res.text());
  if (!res.ok) {
    const err: any = new Error(data?.error || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/**
 * Tenta fazer POST numa lista de paths, avançando para o próximo apenas se der 404.
 * Útil para dar suporte a múltiplas versões/aliases de endpoints do backend.
 */
async function postWithFallbacks<T = any>(paths: string[], json?: unknown): Promise<T> {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      return await request<T>(p, { method: "POST", json });
    } catch (e: any) {
      lastErr = e;
      if (e?.status !== 404) throw e; // só faz fallback em 404
    }
  }
  throw lastErr || new Error("Falha na chamada");
}

/* ================================ API ================================= */

/** API de autenticação para a app mobile. */
export const authApi = {
  /** Iniciar sessão (guarda sessão por cookie no domínio/API). */
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", json: { email, password } }),

  /** Utilizador atual (inclui sessão/roles/actingChild no backend). */
  me: () => request("/auth/me", { method: "GET" }),

  /** Terminar sessão. */
  logout: () => request("/auth/logout", { method: "POST" }),

  /**
   * Ativar “modo criança” (atua em nome da criança).
   * Tenta várias rotas equivalentes (compatibilidade retro).
   */
  actAsChild: (childId: number) =>
    postWithFallbacks(
      ["/auth/act-as-child", "/auth/child/activate", "/family/act-as"],
      { childId }
    ),

  /**
   * Limpar “modo criança” (voltar a atuar como família).
   * Tenta várias rotas equivalentes (compatibilidade retro).
   */
  clearActingChild: () =>
    postWithFallbacks(
      ["/auth/act-as-clear", "/auth/child/clear", "/family/act-as/clear"],
      {}
    ),
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
