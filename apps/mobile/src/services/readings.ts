import { api } from './api';

export type ReadingLite = {
  id: number;
  childId: number;
  childName?: string | null;
  isbn: string;
  title: string;
  coverUrl?: string | null;
  date?: string | null; // ISO
};

type Options = {
  childId?: number;
  childIds?: number[];
  familyId?: number;
};

export async function getLeiturasAtuais(
  limit = 4,
  opts: Options = {}
): Promise<ReadingLite[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (opts.childId) params.childId = String(opts.childId);
  if (opts.childIds?.length) params.childIds = opts.childIds.join(',');
  if (opts.familyId) params.familyId = String(opts.familyId);

  const qs = new URLSearchParams(params).toString();
  const url = `/readings${qs ? `?${qs}` : ''}`;

  const data = await api<ReadingLite[]>(url);
  return Array.isArray(data) ? data : [];
}
