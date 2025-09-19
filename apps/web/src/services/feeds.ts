// apps/web/src/services/feeds.ts
export type LibraryLite = { id: number; name: string };
export type FeedLite = {
  id: number;
  libraryId: number;
  url: string;
  ttl: number | null;
  lastBuildDate?: string | null;
};

function base() {
  return (
    (import.meta as any).env?.VITE_API_URL ||
    (window as any).__API_BASE__ ||
    "/api"
  ).replace(/\/$/, "");
}

export async function listMyLibraries(): Promise<LibraryLite[]> {
  // usa a rota criada antes
  const res = await fetch(`${base()}/libraries/mine`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET /libraries/mine ${res.status}`);
  const data = await res.json();
  return (data.items ?? []).map((x: any) => ({ id: Number(x.id), name: String(x.name) }));
}

export async function listFeeds(libraryId?: number): Promise<FeedLite[]> {
  const url = new URL(`${base()}/admin/feeds`, window.location.origin);
  if (libraryId) url.searchParams.set("libraryId", String(libraryId));
  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`GET /admin/feeds ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

export async function addFeed(input: { libraryId: number; url: string; ttl?: number | null }) {
  const res = await fetch(`${base()}/admin/feeds`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /admin/feeds ${res.status}`);
  return (await res.json()) as FeedLite;
}

export async function updateFeed(id: number, patch: { url?: string; ttl?: number | null }) {
  const res = await fetch(`${base()}/admin/feeds/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PUT /admin/feeds/${id} ${res.status}`);
  return (await res.json()) as FeedLite;
}

export async function removeFeed(id: number) {
  const res = await fetch(`${base()}/admin/feeds/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE /admin/feeds/${id} ${res.status}`);
}
