import { api } from "./https";

export type BookLite = { id: string; title: string; date?: string; coverUrl?: string | null };

// back expõe /api/current e /api/suggestions (sem /books/*)
export async function getLeiturasAtuais(limit = 3): Promise<BookLite[]> {
  const { data } = await api.get("/current", { params: { limit } });
  const arr = Array.isArray(data) ? data : (data?.items ?? []);
  return arr.map((b: any) => ({
    id: String(b.isbn ?? b.id),
    title: b.title ?? b.name ?? "Livro",
    date: b.date ?? b.readAtText ?? "",
    coverUrl: b.coverUrl ?? b.cover ?? b.image ?? null,
  }));
}

export async function getSugestoes(limit = 3): Promise<BookLite[]> {
  const { data } = await api.get("/suggestions", { params: { limit } });
  const arr = Array.isArray(data) ? data : (data?.items ?? []);
  return arr.map((b: any) => ({
    id: String(b.isbn ?? b.id),
    title: b.title ?? b.name ?? "Livro",
    coverUrl: b.coverUrl ?? b.cover ?? b.image ?? null,
  }));
}
