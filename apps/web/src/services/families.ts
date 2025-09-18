export type FamilyLite = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  childrenCount: number;
};

export type ChildLite = { id: number; name: string; birthDate: string };
export type BookLite = { isbn: string; title: string; author?: string | null; coverUrl?: string | null };
export type BadgeLite = { id: number; name: string; type: string };

export type ConsultationLite = {
  id: number;
  status: string;
  startAt?: string | null;
  endAt?: string | null;
  requestedAt?: string | null;
  child?: { id: number; name: string | null } | null;
  librarian?: { id: number; fullName: string } | null;
  library?: { id: number; name: string } | null;
};

export type FamilyDetail = {
  family: { id: number; fullName: string; email: string; phone?: string | null; address?: string | null };
  children: ChildLite[];
  badges: { assignedAt: string; childId: number; badge: BadgeLite }[];
  readings: { id: number; childId: number; startedAt?: string | null; book: BookLite }[];
  reservations: { id: number; childId: number; reservedAt: string; book: BookLite }[];
  ratings: {
    id: number;
    stars: number;
    comment?: string | null;
    ratedAt: string;
    childId?: number | null;
    book: BookLite;
  }[];
  upcomingConsultations: ConsultationLite[];
  recentConsultations: ConsultationLite[];
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function listFamilies(search = "", limit = 25, cursor?: number) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (limit) qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", String(cursor));
  return fetchJson<{ items: FamilyLite[]; nextCursor: number | null }>(
    `/api/librarian/families?${qs.toString()}`
  );
}

export async function getFamilyDetail(id: number) {
  return fetchJson<FamilyDetail>(`/api/librarian/families/${id}`);
}
