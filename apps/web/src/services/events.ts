import { api } from "./https";

export type EventLite = {
  id: number; title: string; date?: string; time?: string; imageUrl?: string | null;
};

// usa /api/events e faz slice no front
export async function getProximosEventos(limit = 3): Promise<EventLite[]> {
  const { data } = await api.get("/events", { params: { limit } });
  const arr = Array.isArray(data) ? data : (data?.items ?? []);
  return arr
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, limit)
    .map((e: any) => ({
      id: Number(e.id),
      title: e.title ?? e.name ?? "Evento",
      date: e.startDateText ?? e.startDate ?? "",
      time: e.time ?? "",
      imageUrl: e.imageUrl ?? e.banner ?? null,
    }));
}
