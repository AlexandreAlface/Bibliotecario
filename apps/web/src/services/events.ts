/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de eventos (próximos). Busca um lote maior no servidor para
 *            evitar “cortes” e depois limita localmente, com normalização de campos.
 */
import { http } from "./https";

export type EventLite = {
  id: number;
  title: string;
  date?: string;
  time?: string;
  imageUrl?: string | null;
  category?: string | null;
  location?: string | null;
};

/** Converte vários formatos de data em timestamp, ou Infinity se inválido. */
function toTs(x: any): number {
  const raw = x?.startDate ?? x?.date ?? x?.startDateText;
  const t = Date.parse(raw ?? "");
  return Number.isFinite(t) ? t : Infinity;
}

/** Normaliza um evento genérico da API para EventLite. */
function normalizeEvent(e: any): EventLite {
  return {
    id: Number(e?.id ?? 0),
    title: String(e?.title ?? e?.name ?? "Evento"),
    date: e?.startDateText ?? e?.startDate ?? e?.date ?? "",
    time: e?.time ?? e?.startTime ?? "",
    imageUrl: e?.imageUrl ?? e?.banner ?? e?.enclosure?.url ?? null,
    category: e?.category ?? null,
    location: e?.location ?? null,
  };
}

/**
 * Devolve os próximos eventos ordenados por data ascendente.
 * Pede mais ao servidor (5x ou mínimo 60) e depois limita localmente.
 */
export async function getProximosEventos(limit = 8): Promise<EventLite[]> {
  const serverLimit = Math.max(limit * 5, 60);
  const res = await http<any>({
    url: "/events",
    method: "GET",
    params: { limit: serverLimit },
  });
  const arr: any[] = Array.isArray(res) ? res : res?.items ?? [];
  return arr
    .sort((a, b) => toTs(a) - toTs(b))
    .map(normalizeEvent)
    .slice(0, limit);
}
