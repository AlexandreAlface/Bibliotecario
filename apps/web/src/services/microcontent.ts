// apps/web/src/services/microcontent.ts
import { api } from "./https";

export type MicroContentItem = {
  id: number;
  text: string;
  type: "BIBLIOTERAPIA" | "DICA" | "FACTO" | "OUTRO";
  tags: string[];
  isPublished?: boolean;
  publishedAt?: string;
  library?: { id: number; name: string } | null;
  books: { isbn: string; title: string; coverUrl?: string | null; summary?: string | null }[];
  author?: { id: number; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listMicroContentsPublic(params: {
  q?: string;
  type?: string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const { data } = await api.get(`/micro-contents?${qs.toString()}`, {
    withCredentials: true,
  });
  return data as { total: number; page: number; limit: number; items: MicroContentItem[] };
}

/* ---------------- Admin ---------------- */

export async function adminListMicroContents(params: {
  q?: string;
  type?: string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const { data } = await api.get(`/admin/micro-contents?${qs.toString()}`, {
    withCredentials: true,
  });
  return data as { total: number; page: number; limit: number; items: MicroContentItem[] };
}

export async function adminCreateMicroContent(payload: {
  text: string;
  type: MicroContentItem["type"];
  tags: string[];
  libraryId?: number | null;
  bookIsbns: string[];
  isPublished?: boolean;
  publishedAt?: string | Date | null;
}) {
  const { data } = await api.post(`/admin/micro-contents`, payload, {
    withCredentials: true,
  });
  return data;
}

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
  const { data } = await api.put(`/admin/micro-contents/${id}`, payload, {
    withCredentials: true,
  });
  return data;
}

export async function adminDeleteMicroContent(id: number) {
  const { data } = await api.delete(`/admin/micro-contents/${id}`, {
    withCredentials: true,
  });
  return data;
}

export async function markMicroContentSeen(microContentId: number) {
  const { data } = await api.post(
    `/micro-interactions`,
    { microContentId },
    { withCredentials: true }
  );
  return data;
}
