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

const toTs = (x: any) => {
  const raw = x?.startDate ?? x?.date;
  const t = Date.parse(raw ?? "");
  return Number.isFinite(t) ? t : Infinity;
};

export async function getProximosEventos(limit = 8): Promise<EventLite[]> {
  // Pedimos mais ao servidor para não “cortar” categorias (ex.: Biblioteca)
  const serverLimit = Math.max(limit * 5, 60);

  const { data } = await api.get("/events", { params: { limit: serverLimit } });
  const arr: any[] = Array.isArray(data) ? data : data?.items ?? [];

  return arr
    .sort((a, b) => toTs(a) - toTs(b))
    .map((e) => ({
      id: Number(e.id),
      title: e.title ?? e.name ?? "Evento",
      date: e.startDateText ?? e.startDate ?? e.date ?? "",
      time: e.time ?? e.startTime ?? "",
      imageUrl: e.imageUrl ?? e.banner ?? e?.enclosure?.url ?? null,
      category: e.category ?? null,
      location: e.location ?? null,
    }));
}
