export const API_URL = import.meta.env.VITE_API_URL;

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',                            // <- necessário para cookie
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  }).catch((e) => { throw new Error('Falha de rede/CORS: ' + e.message); });

  // Lê como texto e tenta JSON (para não rebentar se vier vazio)
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data; // pode ser null em 204
}
