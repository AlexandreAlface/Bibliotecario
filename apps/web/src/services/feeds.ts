// apps/web/src/services/feeds.ts
export type FeedLite = {
  id: number;
  url: string;
  ttl?: number | null;
  lastBuildDate?: string | null;
};
export type LibraryLite = { id: number; name: string };

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
function api(url: string, init?: RequestInit) {
  return fetch(url, { credentials: "include", ...init });
}

/** Devolve a biblioteca associada ao utilizador (primeira associação). */
export async function getMyLibrary(): Promise<LibraryLite | null> {
  const res = await api(`${API_BASE}/admin/feeds/my-library`);
  if (res.status === 404) return null;
  return j<LibraryLite>(res);
}

/** (Opcional/legacy) Listar bibliotecas por métricas – pode não existir no backend atual. */
export async function listMyLibraries(): Promise<LibraryLite[]> {
  const res = await api(`${API_BASE}/admin/metrics/libraries`);
  return j<LibraryLite[]>(res);
}

/** Lista feeds da biblioteca (scoped) */
export async function listFeeds(libraryId: number): Promise<FeedLite[]> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/feeds`);
  return j<FeedLite[]>(res);
}

/** Adiciona feed na biblioteca (scoped) */
export async function addFeed(args: {
  libraryId: number;
  url: string;
  ttl?: number | null;
}): Promise<FeedLite> {
  const payload: any = { url: args.url };
  if (args.ttl !== undefined) payload.ttl = args.ttl;
  const res = await api(`${API_BASE}/admin/libraries/${args.libraryId}/feeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return j<FeedLite>(res);
}

/** Atualiza feed (endpoint legacy por ID) */
export async function updateFeed(
  id: number,
  patch: { url?: string; ttl?: number | null }
): Promise<FeedLite> {
  const res = await api(`${API_BASE}/admin/feeds/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return j<FeedLite>(res);
}

/** Remove feed (endpoint legacy por ID) */
export async function removeFeed(id: number): Promise<void> {
  const res = await api(`${API_BASE}/admin/feeds/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}
