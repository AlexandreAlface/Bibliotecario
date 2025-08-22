import { api } from "./https";

export type BookLite = {
  id: number;
  title: string;
  coverUrl?: string | null;
  date?: string;
  childId?: number;
  childName?: string;
};

type GetOpts = { childId?: number; childIds?: number[]; familyId?: number };

export async function getLeiturasAtuais(
  limit = 4,
  opts: GetOpts = {}
): Promise<BookLite[]> {
  const params: any = { limit };
  if (opts.childId) params.childId = opts.childId;
  if (opts.childIds?.length) params.childIds = opts.childIds.join(",");
  if (opts.familyId) params.familyId = opts.familyId;

  const { data } = await api.get("/readings", { params });
  const arr = Array.isArray(data) ? data : data?.items ?? [];

  return arr.map((r: any) => ({
    id: Number(r.id ?? 0),
    title: r.title ?? "Livro",
    coverUrl: r.coverUrl ?? null,
    date: r.date ?? "",
    childId: r.childId,
    childName: r.childName,
  }));
}
