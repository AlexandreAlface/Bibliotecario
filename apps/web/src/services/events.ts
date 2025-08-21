// apps/web/src/services/events.ts
import { api } from "./https";

export type EventLite = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  imageUrl?: string | null;
  category?: string | null;
  location?: string | null;
};

export async function getProximosEventos(limit = 3): Promise<EventLite[]> {
  // Nota: este endpoint devolve os eventos “crus” do prisma (inclui startDate, category, location, imageUrl)
  const { data } = await api.get("/events", { params: { limit } });

  const arr: any[] = Array.isArray(data) ? data : data?.items ?? [];

  // Ordena por startDate (se houver), depois faz slice e normaliza campos
  return arr
    .sort((a, b) => {
      const ta = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const tb = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return ta - tb;
    })
    .slice(0, limit)
    .map((e) => ({
      id: Number(e.id),
      title: e.title ?? e.name ?? "Evento",
      date: e.startDateText ?? e.startDate ?? e.date ?? "",
      time: e.time ?? e.startTime ?? "",
      imageUrl: e.imageUrl ?? e.banner ?? e?.enclosure?.url ?? null,
      category: e.category ?? e.categories?.[0] ?? null, // 👈 mantemos para o filtro
      location: e.location ?? e.venue ?? null, // 👈 idem
    }));
}
