// apps/mobile/src/services/microcontent.ts
import { request } from "./api";

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

export async function listMicroContentsPublic(opts: {
  q?: string;
  type?: MicroContentType | string;
  tag?: string;
  libraryId?: number;
  page?: number;
  limit?: number;
}): Promise<MicroContentListResponse> {
  const qs = new URLSearchParams();
  if (opts.q) qs.set("q", opts.q);
  if (opts.type) qs.set("type", String(opts.type));
  if (opts.tag) qs.set("tag", opts.tag);
  if (opts.libraryId) qs.set("libraryId", String(opts.libraryId));
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.limit) qs.set("limit", String(opts.limit));

  // ✅ público é /micro-contents (sem /public)
  const data = await request(`/micro-contents?${qs.toString()}`, {
    method: "GET",
  });

  const items: MicroContentItem[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  const total: number =
    typeof data?.total === "number" ? data.total : items.length;

  const tags: string[] =
    Array.isArray(data?.tags) && data.tags.length
      ? data.tags
      : Array.from(
          new Set(
            items.flatMap((mc: any) =>
              Array.isArray(mc?.tags) ? (mc.tags as string[]) : []
            )
          )
        );

  const libraries: { id: number; name: string }[] | undefined = Array.isArray(
    data?.libraries
  )
    ? data.libraries
    : Array.from(
        new Map(
          items
            .filter((mc: any) => mc?.library?.id)
            .map((mc: any) => [
              Number(mc.library.id),
              {
                id: Number(mc.library.id),
                name: String(mc.library.name ?? `Biblioteca #${mc.library.id}`),
              },
            ])
        ).values()
      );

  return { items, total, tags, libraries };
}

export async function markMicroContentSeen(id: number): Promise<void> {
  await request(`/micro-interactions`, {
    method: "POST",
    json: { microContentId: id }, // 👈 não uses "body"
  });
}
