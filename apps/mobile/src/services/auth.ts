// apps/mobile/src/services/auth.ts
import Constants from "expo-constants";

const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3333/api";

type FetchInit = RequestInit & { json?: any };

async function request(path: string, init: FetchInit = {}) {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: json ? JSON.stringify(json) : (rest as any).body,
    ...rest,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = data?.error || `Erro ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// --- NOVO: helper para tentar múltiplos endpoints (fallback 404) ---
async function postWithFallbacks(paths: string[], json?: any) {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      return await request(p, { method: "POST", json });
    } catch (e: any) {
      lastErr = e;
      if (e?.status !== 404) throw e;
      // se 404, tenta o próximo
    }
  }
  throw lastErr || new Error("Falha na chamada");
}

export const authApi = {
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", json: { email, password } }),

  me: () => request("/auth/me", { method: "GET" }),

  logout: () => request("/auth/logout", { method: "POST" }),

  // --- atualizados com fallback, como no web ---
  actAsChild: (childId: number) =>
    postWithFallbacks(
      ["/auth/act-as-child", "/auth/child/activate", "/family/act-as"],
      { childId }
    ),

  clearActingChild: () =>
    postWithFallbacks(
      ["/auth/act-as-clear", "/auth/child/clear", "/family/act-as/clear"],
      {}
    ),
};
