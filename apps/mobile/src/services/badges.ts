import { api } from './api';

export type BadgeLite = {
  id: string;               // "childId_badgeId"
  childId: number;
  childName?: string | null;
  badgeId: number;
  name: string;
  type: string;             // "STAMP" | "TROFÉU" | ...
  criteria?: string | null;
  assignedAt?: string | null; // ISO
};

type Options = {
  childId?: number;
  childIds?: number[];
  familyId?: number;
};

export async function getBadgesRecent(
  limit = 12,
  opts: Options = {}
): Promise<BadgeLite[]> {
  const params: Record<string, string> = { limit: String(limit) };
  if (opts.childId) params.childId = String(opts.childId);
  if (opts.childIds?.length) params.childIds = opts.childIds.join(',');
  if (opts.familyId) params.familyId = String(opts.familyId);

  const qs = new URLSearchParams(params).toString();
  const url = `/badges/assignments${qs ? `?${qs}` : ''}`;

  const data = await api<BadgeLite[]>(url); // GET por omissão
  return Array.isArray(data) ? data : [];
}
