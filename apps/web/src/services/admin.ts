// apps/web/src/services/admin.ts
export type LibrarianLite = { id: number; fullName: string; email: string };
export type FamilyLiteForLib = {
  id: number;
  fullName: string;
  email: string;
  childrenCount: number;
};
export type BlockSlot = {
  id: number;
  startAt: string;
  endAt: string;
  reason?: string | null;
};
export type FeedLite = {
  id: number;
  url: string;
  ttl?: number | null;
  lastBuildDate?: string | null;
};
export type EventLite = {
  id: number;
  title: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  description?: string | null; // 👈 novo
  category?: string | null; // 👈 novo
  source?: "MANUAL" | "FEED";
};
export type LibraryLite = { id: number; name: string };

export type AdminMetrics = {
  activeLibrarians: number;
  familiesServed: number;
  pendingProposals: number;
  weeklyConsultations: { week: string; count: number }[];
  slotUtilization: { date: string; percent: number }[];
};

export type ConsultationLite = {
  id: number;
  startAt: string | null;
  endAt: string | null;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  libraryId?: number | null;
  child?: { id: number; name?: string | null } | null;
  family?: { id: number; fullName?: string | null } | null;
  librarian?: { id: number; fullName: string; email?: string | null } | null;
};

export type SlotLite = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  librarian: { id: number; fullName: string; email?: string | null };
  consultationId?: number | null;
};

export type EventReservationLite = {
  id: number;
  familyId: number;
  familyName: string;
  familyEmail: string;
  familyPhone: string;
  bookedAt: string;
  status: "PENDING" | "CONFIRMED";
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

// --- helpers ---
async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
function api(url: string, init?: RequestInit) {
  // garante envio de cookies de sessão
  return fetch(url, { credentials: "include", ...init });
}

// --- métricas/admin ---
export async function getAdminMetrics(
  libraryId: number
): Promise<AdminMetrics> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/metrics`);
  return j<AdminMetrics>(res);
}

/** Bibliotecas disponíveis para o admin / staff */
export async function listAdminLibraries(): Promise<LibraryLite[]> {
  const res = await api(`${API_BASE}/admin/metrics/libraries`);
  return j<LibraryLite[]>(res);
}

// --- bibliotecários ---
export async function listLibraryLibrarians(
  libraryId: number
): Promise<LibrarianLite[]> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/librarians`);
  return j<LibrarianLite[]>(res);
}
export async function addLibrarianToLibrary(
  libraryId: number,
  email: string
): Promise<LibrarianLite> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/librarians`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return j<LibrarianLite>(res);
}
export async function removeLibrarianFromLibrary(
  libraryId: number,
  userId: number
): Promise<void> {
  const res = await api(
    `${API_BASE}/admin/libraries/${libraryId}/librarians/${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text());
}

// --- famílias (read-only) ---
export async function listFamiliesForLibrary(
  libraryId: number,
  query = "",
  limit = 25,
  cursor?: number | null
): Promise<{ items: FamilyLiteForLib[]; nextCursor?: number | null }> {
  const url = new URL(
    `${API_BASE}/admin/libraries/${libraryId}/families`,
    location.origin
  );
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", String(cursor));
  const res = await api(url.toString());
  return j(res);
}

// --- bloqueios globais ---
export async function listGlobalBlocks(
  libraryId: number
): Promise<BlockSlot[]> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/blocks`);
  return j<BlockSlot[]>(res);
}
export async function createGlobalBlock(
  libraryId: number,
  data: { startAt: string; endAt: string; reason?: string }
) {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return j<BlockSlot>(res);
}
export async function deleteGlobalBlock(libraryId: number, blockId: number) {
  const res = await api(
    `${API_BASE}/admin/libraries/${libraryId}/blocks/${blockId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text());
}

// --- eventos & feeds ---
export async function listLibraryEvents(
  libraryId: number
): Promise<EventLite[]> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/events`);
  return j<EventLite[]>(res);
}
export async function upsertEvent(libraryId: number, ev: Partial<EventLite>) {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
  return j<EventLite>(res);
}
export async function deleteEvent(libraryId: number, id: number) {
  const res = await api(
    `${API_BASE}/admin/libraries/${libraryId}/events/${id}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function listFeeds(libraryId: number): Promise<FeedLite[]> {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/feeds`);
  return j<FeedLite[]>(res);
}
export async function upsertFeed(libraryId: number, feed: Partial<FeedLite>) {
  const res = await api(`${API_BASE}/admin/libraries/${libraryId}/feeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feed),
  });
  return j<FeedLite>(res);
}
export async function deleteFeed(libraryId: number, id: number) {
  const res = await api(
    `${API_BASE}/admin/libraries/${libraryId}/feeds/${id}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function listLibraryConsultations(
  libraryId: number,
  opts?: { statuses?: string[]; librarianId?: number | null; q?: string }
): Promise<ConsultationLite[]> {
  const url = new URL(
    `${API_BASE}/admin/libraries/${libraryId}/consultations`,
    location.origin
  );
  if (opts?.statuses?.length)
    url.searchParams.set("status", opts.statuses.join(","));
  if (opts?.librarianId)
    url.searchParams.set("librarianId", String(opts.librarianId));
  if (opts?.q) url.searchParams.set("q", opts.q);
  const res = await api(url.toString());
  return j<ConsultationLite[]>(res);
}

export async function listLibrarySlots(
  libraryId: number,
  opts?: {
    from?: string;
    to?: string;
    statuses?: Array<"OPEN" | "BOOKED" | "BLOCKED">;
    librarianId?: number | null;
  }
): Promise<SlotLite[]> {
  const url = new URL(
    `${API_BASE}/admin/libraries/${libraryId}/slots`,
    location.origin
  );
  if (opts?.from) url.searchParams.set("from", opts.from);
  if (opts?.to) url.searchParams.set("to", opts.to);
  if (opts?.statuses?.length)
    url.searchParams.set("status", opts.statuses.join(","));
  if (opts?.librarianId)
    url.searchParams.set("librarianId", String(opts.librarianId));
  const res = await api(url.toString());
  return j<SlotLite[]>(res);
}

export async function setSlotStatus(
  libraryId: number,
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  const res = await api(
    `${API_BASE}/admin/libraries/${libraryId}/slots/${slotId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  return j<{ id: number; status: "OPEN" | "BLOCKED" }>(res);
}

export async function listEventReservations(
  eventId: number,
  params?: { status?: string; q?: string; page?: number; limit?: number }
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/reservations?${qs}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    total: number;
    page: number;
    limit: number;
    items: EventReservationLite[];
  }>;
}

export async function updateEventReservationStatus(
  eventId: number,
  reservationId: number,
  status: "PENDING" | "CONFIRMED"
) {
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/reservations/${reservationId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createEventReservation(
  eventId: number,
  familyId: number,
  status: "PENDING" | "CONFIRMED" = "PENDING"
) {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}/reservations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ familyId, status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteEventReservation(
  eventId: number,
  reservationId: number
) {
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/reservations/${reservationId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function getEventReservationsSummary(eventId: number) {
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/reservations/summary`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    capacity: number | null;
    confirmed: number;
    pending: number;
    total: number;
  }>;
}
