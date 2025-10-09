/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de Microconteúdos (listagem pública e admin, CRUD e interações).
 *            Usa cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { http } from "./https";

/* ---------------- Tipos ---------------- */

export type MicroContentItem = {
  id: number;
  text: string;
  type: "BIBLIOTERAPIA" | "DICA" | "FACTO" | "OUTRO";
  tags: string[];
  isPublished?: boolean;
  publishedAt?: string;
  library?: { id: number; name: string } | null;
  books: {
    isbn: string;
    title: string;
    coverUrl?: string | null;
    summary?: string | null;
  }[];
  author?: { id: number; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  // NOVO
  seen?: boolean;
  interactionsCount?: number;
};

export type Page<T> = {
  total: number;
  page: number;
  limit: number;
  items: T[];
};

/* --------------- Helpers --------------- */

/** Constrói params ignorando undefined/null/"" */
function cleanParams<T extends Record<string, unknown>>(
  p: T
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

/** Normaliza publishedAt (aceita string/Date/null). */
function asDateString(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  try {
    return v.toISOString();
  } catch {
    return null;
  }
}

/* --------------- Público --------------- */

/** Lista microconteúdos públicos com filtros e paginação. */
export async function listMicroContentsPublic(params: {
  q?: string;
  type?: string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}): Promise<Page<MicroContentItem>> {
  return http<Page<MicroContentItem>>({
    url: "/micro-contents",
    method: "GET",
    params: cleanParams(params),
  });
}

/* ---------------- Admin ---------------- */

/** Lista microconteúdos (área admin) com filtros e paginação. */
export async function adminListMicroContents(params: {
  q?: string;
  type?: string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}): Promise<Page<MicroContentItem>> {
  return http<Page<MicroContentItem>>({
    url: "/admin/micro-contents",
    method: "GET",
    params: cleanParams(params),
  });
}

/** Cria microconteúdo (admin). */
export async function adminCreateMicroContent(payload: {
  text: string;
  type: MicroContentItem["type"];
  tags: string[];
  libraryId?: number | null;
  bookIsbns: string[];
  isPublished?: boolean;
  publishedAt?: string | Date | null;
}) {
  const body = { ...payload, publishedAt: asDateString(payload.publishedAt) };
  return http<any>({
    url: "/admin/micro-contents",
    method: "POST",
    data: body,
  });
}

/** Atualiza microconteúdo (admin). */
export async function adminUpdateMicroContent(
  id: number,
  payload: {
    text: string;
    type: MicroContentItem["type"];
    tags: string[];
    libraryId?: number | null;
    bookIsbns: string[];
    isPublished?: boolean;
    publishedAt?: string | Date | null;
  }
) {
  const body = { ...payload, publishedAt: asDateString(payload.publishedAt) };
  return http<any>({
    url: `/admin/micro-contents/${id}`,
    method: "PUT",
    data: body,
  });
}

/** Apaga microconteúdo (admin). */
export async function adminDeleteMicroContent(id: number) {
  return http<any>({ url: `/admin/micro-contents/${id}`, method: "DELETE" });
}

/** Marca um microconteúdo como visto (interação simples). */
export async function markMicroContentSeen(microContentId: number) {
  return http<any>({
    url: "/micro-interactions",
    method: "POST",
    data: { microContentId },
  });
}
