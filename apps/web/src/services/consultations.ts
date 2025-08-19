import { api } from "./https";

export type Consulta = { id: number; title: string; date: string; time?: string };

export async function getNextConsultas(limit = 3): Promise<Consulta[]> {
  const { data } = await api.get("/consultations/next", { params: { limit } });
  return (data || []).map((c: any) => ({
    id: c.id,
    title: c.title || `Consulta #${c.id}`,
    date: c.date || c.scheduledAtText || "",
    time: c.time || "",
  }));
}

// bibliotecário
export async function getPendingConsultations(limit = 5) {
  const { data } = await api.get("/consultations/pending", { params: { limit } });
  return data;
}
