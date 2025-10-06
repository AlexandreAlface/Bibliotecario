/**
 * =============================================================================
 *  Módulo: apps/mobile/src/services/microcontent.ts
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários claros (PT-PT) e cabeçalho com autor/nº aluno.
 *   • Helpers **PUROS** (sem efeitos laterais) para querystrings e normalização.
 *   • Funções pequenas (≤ 30 linhas), coesas e com tipos explícitos.
 *   • Normalização resiliente da resposta: items, total, tags, libraries.
 * =============================================================================
 */

import { request } from "./api";

/* =============================== Tipos =============================== */

export type MicroContentType = "BIBLIOTERAPIA" | "DICA" | "FACTO" | "OUTRO";

export type MicroContentBook = {
  isbn: string;
  title: string;
  coverUrl?: string | null;
  summary?: string | null;
};

export type MicroContentItem = {
  id: number;
  text: string;
  type: MicroContentType;
  isPublished?: boolean;
  tags: string[];
  library?: { id: number; name: string } | null;
  books?: MicroContentBook[];
  seen?: boolean;
  seenAt?: string | null;
};

export type MicroContentListResponse = {
  items: MicroContentItem[];
  total: number;
  tags?: string[];
  libraries?: { id: number; name: string }[];
};

/* ============================ Helpers PUROS =========================== */

/** 🔹 **PURO**: cria querystring ignorando valores vazios/nulos. */
function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** 🔹 **PURO**: devolve array tipado (ou vazio). */
function asArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

/** 🔹 **PURO**: deduz items da resposta (suporta {items} ou array direto). */
function extractItems(payload: any): MicroContentItem[] {
  if (Array.isArray(payload?.items)) return payload.items as MicroContentItem[];
  if (Array.isArray(payload)) return payload as MicroContentItem[];
  return [];
}

/** 🔹 **PURO**: devolve total coerente (campo total ou length dos items). */
function extractTotal(payload: any, items: MicroContentItem[]): number {
  return typeof payload?.total === "number" ? payload.total : items.length;
}

/** 🔹 **PURO**: deduz tags da resposta ou a partir dos items. */
function extractTags(payload: any, items: MicroContentItem[]): string[] {
  const fromPayload = asArray<string>(payload?.tags);
  if (fromPayload.length) return fromPayload;
  const bag = new Set<string>();
  for (const it of items) {
    for (const t of it.tags || []) bag.add(t);
  }
  return Array.from(bag);
}

/** 🔹 **PURO**: deduz bibliotecas da resposta ou a partir dos items. */
function extractLibraries(
  payload: any,
  items: MicroContentItem[]
): { id: number; name: string }[] | undefined {
  const fromPayload = asArray<{ id: number; name: string }>(payload?.libraries);
  if (fromPayload.length) return fromPayload;
  const map = new Map<number, { id: number; name: string }>();
  for (const it of items) {
    const lib = it.library;
    if (lib?.id) {
      map.set(lib.id, {
        id: Number(lib.id),
        name: String(lib.name ?? `Biblioteca #${lib.id}`),
      });
    }
  }
  return Array.from(map.values());
}

/* ================================= API ================================ */

/**
 * Lista micro-conteúdos públicos (com paginação/filtros).
 * Mantém compatibilidade com variações da API e normaliza a resposta.
 */
export async function listMicroContentsPublic(opts: {
  q?: string;
  type?: MicroContentType | string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}): Promise<MicroContentListResponse> {
  const query = toQuery({
    q: opts.q,
    type: opts.type,
    tag: opts.tag,
    libraryId: opts.libraryId,
    page: opts.page,
    limit: opts.limit,
  });

  // ✅ endpoint público
  const raw = await request(`/micro-contents${query}`, { method: "GET" });

  // normalização resiliente
  const items = extractItems(raw);
  const total = extractTotal(raw, items);
  const tags = extractTags(raw, items);
  const libraries = extractLibraries(raw, items);

  return { items, total, tags, libraries };
}

/**
 * Marca um micro-conteúdo como visto (para UX/analytics no cliente).
 * Envia JSON no campo 'json' (não 'body'), como definido no nosso wrapper.
 */
export async function markMicroContentSeen(id: number): Promise<void> {
  await request(`/micro-interactions`, {
    method: "POST",
    json: { microContentId: id },
  });
}

/* ============================== Fim do módulo ==============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
