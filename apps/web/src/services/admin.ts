// apps/web/src/services/admin.ts
export type LibrarianLite = { id: number; fullName: string; email: string };
export type FamilyLiteForLib = { id: number; fullName: string; email: string; childrenCount: number };
export type BlockSlot = { id: number; startAt: string; endAt: string; reason?: string | null };
export type FeedLite = { id: number; url: string; ttl?: number | null; lastBuildDate?: string | null };
export type EventLite = { id: number; title: string; startDate: string; endDate?: string | null; location?: string | null };

export type AdminMetrics = {
  activeLibrarians: number;
  familiesServed: number;
  pendingProposals: number;
  weeklyConsultations: { week: string; count: number }[];
  slotUtilization: { date: string; percent: number }[];
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function getAdminMetrics(libraryId: number): Promise<AdminMetrics> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/metrics`);
  return j<AdminMetrics>(res);
}

// --- bibliotecários
export async function listLibraryLibrarians(libraryId: number): Promise<LibrarianLite[]> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/librarians`);
  return j<LibrarianLite[]>(res);
}
export async function addLibrarianToLibrary(libraryId: number, email: string): Promise<LibrarianLite> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/librarians`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return j<LibrarianLite>(res);
}
export async function removeLibrarianFromLibrary(libraryId: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/librarians/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

// --- famílias (read-only)
export async function listFamiliesForLibrary(
  libraryId: number,
  query = "",
  limit = 25,
  cursor?: number | null
): Promise<{ items: FamilyLiteForLib[]; nextCursor?: number | null }> {
  const url = new URL(`${API_BASE}/admin/libraries/${libraryId}/families`, location.origin);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", String(cursor));
  const res = await fetch(url.toString());
  return j(res);
}

// --- bloqueios globais (slots com status=BLOCKED, sem consultation)
export async function listGlobalBlocks(libraryId: number): Promise<BlockSlot[]> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/blocks`);
  return j<BlockSlot[]>(res);
}
export async function createGlobalBlock(libraryId: number, data: { startAt: string; endAt: string; reason?: string }) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return j<BlockSlot>(res);
}
export async function deleteGlobalBlock(libraryId: number, blockId: number) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/blocks/${blockId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

// --- eventos & feeds
export async function listLibraryEvents(libraryId: number): Promise<EventLite[]> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/events`);
  return j<EventLite[]>(res);
}
export async function upsertEvent(libraryId: number, ev: Partial<EventLite>) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
  return j<EventLite>(res);
}
export async function deleteEvent(libraryId: number, id: number) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function listFeeds(libraryId: number): Promise<FeedLite[]> {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/feeds`);
  return j<FeedLite[]>(res);
}
export async function upsertFeed(libraryId: number, feed: Partial<FeedLite>) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/feeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feed),
  });
  return j<FeedLite>(res);
}
export async function deleteFeed(libraryId: number, id: number) {
  const res = await fetch(`${API_BASE}/admin/libraries/${libraryId}/feeds/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}
