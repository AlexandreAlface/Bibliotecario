// apps/mobile/src/services/librarianFamilies.ts
import { API_URL } from "src/services/api";

/** === Tipos iguais aos do web/src/services/families.ts === */
export type FamilyLite = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  childrenCount: number;
};

export type ChildLite = { id: number; name: string; birthDate: string };
export type BookLite = {
  isbn: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
};
export type BadgeLite = { id: number; name: string; type: string };

export type ConsultationLite = {
  id: number;
  status: string;
  startAt?: string | null;
  endAt?: string | null;
  title?: string | null;
  child?: { id: number; name: string | null } | null;
  librarian?: { id: number; fullName: string } | null;
  library?: { id: number; name: string } | null;
};

export type RatingLite = {
  id: number;
  stars: number;
  comment?: string | null;
  ratedAt: string;
  childId?: number | null;
  book: BookLite;
};

export type FamilyDetail = {
  family: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
  };
  children: ChildLite[];
  badges: { assignedAt: string; childId: number; badge: BadgeLite }[];
  readings: { id: number; childId: number; startedAt?: string | null; book: BookLite }[];
  reservations: { id: number; childId: number; reservedAt: string; book: BookLite }[];
  ratings: RatingLite[];
  upcomingConsultations: ConsultationLite[];
  recentConsultations: ConsultationLite[];
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(init ?? {}),
  });
  if (!res.ok) {
    let msg = "";
    try {
      msg = await res.text();
    } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Lista (web: GET /api/librarian/families?search=&limit=&cursor=) */
export async function listFamilies(params?: {
  search?: string;
  limit?: number;
  cursor?: number | null;
}): Promise<{ items: FamilyLite[]; nextCursor: number | null }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", String(params.cursor));

  // usa exatamente a mesma rota da web
  const base = `${API_URL}/api/librarian/families`;
  const url = `${base}?${qs.toString()}`;

  // algumas configs locais tinham "API_URL = .../api" → evitar /api/api duplicado
  const safeUrl = url.replace("/api/api/", "/api/");

  const data = await getJson<any>(safeUrl);
  // web devolve { items, nextCursor }
  if (Array.isArray(data)) {
    return { items: data as FamilyLite[], nextCursor: null };
  }
  const items = (data?.items ?? []) as FamilyLite[];
  const nextCursor =
    typeof data?.nextCursor === "number" ? (data.nextCursor as number) : null;
  return { items, nextCursor };
}

/** Detalhe (web: GET /api/librarian/families/:id) */
export async function getFamilyDetail(id: number): Promise<FamilyDetail> {
  const url = `${API_URL}/api/librarian/families/${id}`.replace(
    "/api/api/",
    "/api/"
  );
  return getJson<FamilyDetail>(url);
}
