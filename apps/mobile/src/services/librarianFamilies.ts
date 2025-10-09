/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/librarianFamilies.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários detalhados (PT-PT) em todo o código.
 *   • Helpers **PUROS** para querystring, junção de URLs e normalização.
 *   • Funções pequenas (≤ 30 linhas) e coesas.
 *   • Tolerância a respostas diferentes do backend (normalização robusta).
 * =============================================================================
 */

import { API_URL } from "src/services/api";

/* =============================== Tipos =============================== */
/** Família simplificada (lista) — alinhado com web/src/services/families.ts */
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

/** Payload do detalhe da família (vista do bibliotecário) */
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
  readings: {
    id: number;
    childId: number;
    startedAt?: string | null;
    book: BookLite;
  }[];
  reservations: {
    id: number;
    childId: number;
    reservedAt: string;
    book: BookLite;
  }[];
  ratings: RatingLite[];
  upcomingConsultations: ConsultationLite[];
  recentConsultations: ConsultationLite[];
};

/* ============================ Helpers PUROS =========================== */

/** 🔹 **PURO**: cria querystring ignorando nulos/vazios. */
function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** 🔹 **PURO**: junta base + path e evita duplicar '/api/api/'. */
function safeJoinApi(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`.replace(/\/api\/api\//, "/api/");
}

/** 🔹 **PURO**: normaliza a resposta da lista para { items, nextCursor }. */
function normalizeListFamiliesResponse(raw: any): {
  items: FamilyLite[];
  nextCursor: number | null;
} {
  // Alguns backends podem devolver array direto ou ter forma { items, nextCursor }
  if (Array.isArray(raw)) return { items: raw as FamilyLite[], nextCursor: null };
  const items = Array.isArray(raw?.items) ? (raw.items as FamilyLite[]) : [];
  const next =
    typeof raw?.nextCursor === "number" ? (raw.nextCursor as number) : null;
  return { items, nextCursor: next };
}

/* =============================== HTTP ================================ */

/**
 * GET JSON com credenciais e erros mais legíveis.
 * Mantém-se curto (≤ 30 linhas) e sem efeitos colaterais externos.
 */
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
    } catch {
      /* ignora erro ao ler texto */
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/* ================================ API ================================ */

/**
 * Lista famílias (paginado) para o bibliotecário.
 * web: GET /api/librarian/families?search=&limit=&cursor=
 */
export async function listFamilies(params?: {
  search?: string;
  limit?: number;
  cursor?: number | null;
}): Promise<{ items: FamilyLite[]; nextCursor: number | null }> {
  // Construção de query limpa e robusta
  const query = toQuery({
    search: params?.search,
    limit: params?.limit,
    cursor: params?.cursor,
  });

  // Evita /api/api com configs onde API_URL já contém '/api'
  const url = safeJoinApi(API_URL, `/api/librarian/families${query}`);

  const raw = await getJson<any>(url);
  return normalizeListFamiliesResponse(raw);
}

/**
 * Detalhe da família (inclui crianças, leituras, ratings, consultas, etc.)
 * web: GET /api/librarian/families/:id
 */
export async function getFamilyDetail(id: number): Promise<FamilyDetail> {
  const url = safeJoinApi(API_URL, `/api/librarian/families/${id}`);
  return getJson<FamilyDetail>(url);
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
