import { api } from "./https";

export type BadgeLite = {
  id: string;           // "childId_badgeId"
  childId: number;
  childName?: string | null;
  badgeId: number;
  name: string;
  type: string;         // "STAMP" | "TROFÉU" | ...
  criteria?: string | null;
  assignedAt?: string | null;
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
  const params: any = { limit };
  if (opts.childId) params.childId = opts.childId;
  if (opts.childIds?.length) params.childIds = opts.childIds.join(",");
  if (opts.familyId) params.familyId = opts.familyId;

  // ⚠️ nova rota
  const { data } = await api.get("/badge-assignments", { params });
  const arr: any[] = Array.isArray(data) ? data : data?.items ?? [];
  return arr.map((r) => ({
    id: r.id ?? `${r.childId}_${r.badgeId}`,
    childId: Number(r.childId),
    childName: r.childName ?? null,
    badgeId: Number(r.badgeId),
    name: r.name ?? "",
    type: r.type ?? "",
    criteria: r.criteria ?? null,
    assignedAt: r.assignedAt ?? null,
  }));
}
