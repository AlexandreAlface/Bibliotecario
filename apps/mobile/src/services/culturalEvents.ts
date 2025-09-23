// apps/mobile/src/services/culturalEvents.ts
import { request } from "./api";

export type CulturalEvent = {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;       // ISO
  endDate?: string | null; // ISO
  location?: string | null;
  category?: string | null;
  capacity?: number | null;
  imageUrl?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  reserved?: boolean;      // calculado para família autenticada
};

export type ListParams = {
  q?: string;        // filtro local (client-side, como na web)
  from?: string;     // 'YYYY-MM-DD'
  to?: string;       // 'YYYY-MM-DD'
  limit?: number;    // default 24
  cursor?: number | null;
};

export type ListResponse = {
  items: CulturalEvent[];
  nextCursor: number | null;
};

export async function listCulturalEvents(params: ListParams): Promise<ListResponse> {
  const { q, from, to, limit = 24, cursor } = params || {};
  const url = new URL("/cultural-events", "http://dummy"); // base ignorado pelo request
  url.searchParams.set("limit", String(limit));
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (cursor != null) url.searchParams.set("cursor", String(cursor));
  // NOTA: q é aplicado client-side para replicar a web
  return request<ListResponse>(url.pathname + url.search);
}

export async function reserveEvent(eventId: number) {
  return request(`/cultural-events/${eventId}/reservations`, { method: "POST" });
}

export async function cancelEventReservation(eventId: number) {
  return request(`/cultural-events/${eventId}/reservations`, { method: "DELETE" });
}
