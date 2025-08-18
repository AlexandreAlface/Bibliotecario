// src/services/events.ts
import { api } from './api';

/** Evento “light” para o mobile */
export type EventLite = {
  id: number | string;
  title: string;
  date: string;                // "15/07/2025"
  time?: string;               // "11:00"
  location?: string;
  imageUrl?: string | null;    // opcional (feed/capa)
};

/** Próximas consultas (novo endpoint /consultations/next) */
export async function getNextConsultas(limit = 3): Promise<EventLite[]> {
  const rows = await api<any[]>(`/consultations/next?limit=${limit}`);
  // API já devolve { id, title, date, time, ... } — garantimos shape e fallback
  return rows.map(r => ({
    id: r.id,
    title: r.title ?? 'Consulta',
    date: r.date ?? '',
    time: r.time ?? '',
    location: r.location ?? undefined,
  }));
}

/** Próximos eventos culturais (com imagem se existir) */
export async function getProximosEventos(limit = 3): Promise<EventLite[]> {
  // o router de /events já aceita ?type=evento&limit=...
  const rows = await api<any[]>(`/events?type=evento&limit=${limit}`);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    date: r.date,                 // o router já formata para pt-PT
    time: r.time,
    location: r.location ?? undefined,
    imageUrl: r.imageUrl ?? null, // se adicionares imageUrl no backend, entra aqui
  }));
}
