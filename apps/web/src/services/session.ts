// apps/web/src/services/session.ts
// Serviço mínimo e auto-contido para sessão/“acting child”.
// Usa fetch com credentials para cookies (ajusta paths se necessário).

type Json = any;

const BASE = import.meta.env.VITE_API_URL || ""; // se tiveres um baseUrl

async function j<T = Json>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const sessionApi = {
  me: async <T = any>() =>
    j<T>(await fetch(`${BASE}/auth/me`, { credentials: "include" })),

  actAsChild: async (childId: number) =>
    j(await fetch(`${BASE}/auth/acting-child`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    })),

  clearActingChild: async () =>
    j(await fetch(`${BASE}/auth/acting-child/clear`, {
      method: "POST",
      credentials: "include",
    })),
};
