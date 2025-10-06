/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço do bibliotecário para gerir famílias (listagem e detalhe).
 *            Usa o cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { http } from "./https";

/* ---------- Tipos ---------- */

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
  requestedAt?: string | null;
  child?: { id: number; name: string | null } | null;
  librarian?: { id: number; fullName: string } | null;
  library?: { id: number; name: string } | null;
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

/* ---------- Helpers ---------- */

/** Constrói params ignorando undefined/"" (mantém null/0/false). */
function paramsOf(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input))
    if (v !== undefined && v !== "") out[k] = v;
  return out;
}

/* ---------- API ---------- */

/**
 * Lista famílias com pesquisa, paginação por cursor e limite.
 * @param search Texto de pesquisa (nome/email/telefone).
 * @param limit  Número máximo de itens (default 25).
 * @param cursor Cursor para próxima página (opcional).
 */
export async function listFamilies(search = "", limit = 25, cursor?: number) {
  return http<{ items: FamilyLite[]; nextCursor: number | null }>({
    url: "/librarian/families",
    method: "GET",
    params: paramsOf({ search, limit, cursor }),
  });
}

/**
 * Obtém o detalhe completo de uma família.
 * @param id ID da família.
 */
export async function getFamilyDetail(id: number) {
  return http<FamilyDetail>({
    url: `/librarian/families/${id}`,
    method: "GET",
  });
}
