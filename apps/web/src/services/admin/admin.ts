/**
 * Alexandre Brrissos 21131
 * Descrição: Serviços de administração (bibliotecas, métricas, bibliotecários,
 *            famílias, slots, eventos e reservas). Usa o cliente HTTP central.
 */

import { http } from "../https";

/* ---------------- Tipos ---------------- */
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
  description?: string | null;
  category?: string | null;
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

/* --------------- Helpers --------------- */
function paramsOf(p: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    out[k] = v;
  }
  return out;
}

/* -------- Biblioteca do utilizador -------- */
export async function getMyLibrary(): Promise<LibraryLite | null> {
  try {
    return await http<LibraryLite>({ url: "/admin/feeds/my-library", method: "GET" });
  } catch {
    return null;
  }
}

/* ------------------- Métricas ------------------- */
export async function getAdminMetrics(libraryId: number): Promise<AdminMetrics> {
  return http<AdminMetrics>({
    url: `/admin/libraries/${libraryId}/metrics`,
    method: "GET",
  });
}

/** (Legacy) Lista bibliotecas por métricas. */
export async function listAdminLibraries(): Promise<LibraryLite[]> {
  return http<LibraryLite[]>({ url: "/admin/metrics/libraries", method: "GET" });
}

/* ----------------- Bibliotecários ----------------- */
export async function listLibraryLibrarians(libraryId: number): Promise<LibrarianLite[]> {
  return http<LibrarianLite[]>({
    url: `/admin/libraries/${libraryId}/librarians`,
    method: "GET",
  });
}
export async function addLibrarianToLibrary(libraryId: number, email: string) {
  return http<LibrarianLite>({
    url: `/admin/libraries/${libraryId}/librarians`,
    method: "POST",
    data: { email },
  });
}
export async function removeLibrarianFromLibrary(libraryId: number, userId: number) {
  await http<void>({
    url: `/admin/libraries/${libraryId}/librarians/${userId}`,
    method: "DELETE",
  });
}

/* ------------------ Famílias (RO) ------------------ */
export async function listFamiliesForLibrary(
  libraryId: number,
  query = "",
  limit = 25,
  cursor?: number | null
): Promise<{ items: FamilyLiteForLib[]; nextCursor?: number | null }> {
  return http<{ items: FamilyLiteForLib[]; nextCursor?: number | null }>({
    url: `/admin/libraries/${libraryId}/families`,
    method: "GET",
    params: paramsOf({ q: query, limit, cursor }),
  });
}

/* ----------------- Bloqueios globais ----------------- */
export async function listGlobalBlocks(libraryId: number): Promise<BlockSlot[]> {
  return http<BlockSlot[]>({
    url: `/admin/libraries/${libraryId}/blocks`,
    method: "GET",
  });
}
export async function createGlobalBlock(
  libraryId: number,
  data: { startAt: string; endAt: string; reason?: string }
) {
  return http<BlockSlot>({
    url: `/admin/libraries/${libraryId}/blocks`,
    method: "POST",
    data,
  });
}
export async function deleteGlobalBlock(libraryId: number, blockId: number) {
  await http<void>({
    url: `/admin/libraries/${libraryId}/blocks/${blockId}`,
    method: "DELETE",
  });
}

/* ----------------- Eventos & Feeds ----------------- */
export async function listLibraryEvents(libraryId: number): Promise<EventLite[]> {
  return http<EventLite[]>({
    url: `/admin/libraries/${libraryId}/events`,
    method: "GET",
  });
}
export async function upsertEvent(libraryId: number, ev: Partial<EventLite>) {
  return http<EventLite>({
    url: `/admin/libraries/${libraryId}/events`,
    method: "POST",
    data: ev,
  });
}
export async function deleteEvent(libraryId: number, id: number) {
  await http<void>({
    url: `/admin/libraries/${libraryId}/events/${id}`,
    method: "DELETE",
  });
}

export async function listFeeds(libraryId: number): Promise<FeedLite[]> {
  return http<FeedLite[]>({
    url: `/admin/libraries/${libraryId}/feeds`,
    method: "GET",
  });
}
export async function upsertFeed(libraryId: number, feed: Partial<FeedLite>) {
  return http<FeedLite>({
    url: `/admin/libraries/${libraryId}/feeds`,
    method: "POST",
    data: feed,
  });
}
export async function deleteFeed(libraryId: number, id: number) {
  await http<void>({
    url: `/admin/libraries/${libraryId}/feeds/${id}`,
    method: "DELETE",
  });
}

/* --------------- Consultas & Slots --------------- */
export async function listLibraryConsultations(
  libraryId: number,
  opts?: { statuses?: string[]; librarianId?: number | null; q?: string }
): Promise<ConsultationLite[]> {
  return http<ConsultationLite[]>({
    url: `/admin/libraries/${libraryId}/consultations`,
    method: "GET",
    params: paramsOf({
      status: opts?.statuses?.length ? opts.statuses.join(",") : undefined,
      librarianId: opts?.librarianId ?? undefined,
      q: opts?.q,
    }),
  });
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
  return http<SlotLite[]>({
    url: `/admin/libraries/${libraryId}/slots`,
    method: "GET",
    params: paramsOf({
      from: opts?.from,
      to: opts?.to,
      status: opts?.statuses?.length ? opts.statuses.join(",") : undefined,
      librarianId: opts?.librarianId ?? undefined,
    }),
  });
}

export async function setSlotStatus(
  libraryId: number,
  slotId: number,
  status: "OPEN" | "BLOCKED"
) {
  return http<{ id: number; status: "OPEN" | "BLOCKED" }>({
    url: `/admin/libraries/${libraryId}/slots/${slotId}`,
    method: "PATCH",
    data: { status },
  });
}

/* ---------------- Reservas de evento ---------------- */
export async function listEventReservations(
  eventId: number,
  params?: { status?: string; q?: string; page?: number; limit?: number }
) {
  return http<{
    total: number;
    page: number;
    limit: number;
    items: EventReservationLite[];
  }>({
    url: `/admin/events/${eventId}/reservations`,
    method: "GET",
    params: paramsOf(params || {}),
  });
}

export async function updateEventReservationStatus(
  eventId: number,
  reservationId: number,
  status: "PENDING" | "CONFIRMED"
) {
  return http<any>({
    url: `/admin/events/${eventId}/reservations/${reservationId}`,
    method: "PATCH",
    data: { status },
  });
}

export async function createEventReservation(
  eventId: number,
  familyId: number,
  status: "PENDING" | "CONFIRMED" = "PENDING"
) {
  return http<any>({
    url: `/admin/events/${eventId}/reservations`,
    method: "POST",
    data: { familyId, status },
  });
}

export async function deleteEventReservation(eventId: number, reservationId: number) {
  await http<void>({
    url: `/admin/events/${eventId}/reservations/${reservationId}`,
    method: "DELETE",
  });
}

export async function getEventReservationsSummary(eventId: number) {
  return http<{
    capacity: number | null;
    confirmed: number;
    pending: number;
    total: number;
  }>({
    url: `/admin/events/${eventId}/reservations/summary`,
    method: "GET",
  });
}
