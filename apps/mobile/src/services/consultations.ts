import { api } from './api';

export type ConsultaLite = {
  id: number;
  title: string;
  date?: string | null;
  scheduledAt?: string | null;
  status?: string | null;
  librarianName?: string | null;
};

export async function getNextConsultas(limit = 6): Promise<ConsultaLite[]> {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  const url = `/consultations/next?${qs}`;

  const data = await api<ConsultaLite[]>(url);
  return Array.isArray(data) ? data : [];
}
