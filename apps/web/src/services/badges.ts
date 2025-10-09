/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de Insígnias (catálogo e atribuições). Usa o cliente HTTP central.
 */
import { http } from "./https";

/* ---------------- Tipos ---------------- */
export type Badge = {
  id: number;
  name: string;
  type: "STAMP" | "TROFÉU" | string;
  criteria?: string | null;
};

export type BadgeAssignment = {
  badgeId: number;
  childId: number;
  assignedAt: string; // ISO
  badge?: Badge;
};

export type BadgeLite = {
  id: number; // badgeId
  name: string;
  type: string;
  criteria?: string | null;
  assignedAt?: string;
  childId?: number;
  childName?: string;
};

/* --------------- Helpers --------------- */

/** Limpa params: remove undefined/null/"" e números não finitos. */
function paramsOf(p: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    out[k] = String(v);
  }
  return out;
}

/** Normaliza diferentes shapes de atribuições para BadgeLite. */
function normalizeRecent(data: any): BadgeLite[] {
  if (!Array.isArray(data)) return [];
  return data.map((row: any) => {
    const b = row?.badge ?? row;
    const id = Number(b?.id ?? row?.badgeId ?? 0);
    const childId = Number(row?.childId ?? row?.child?.id);
    const assignedAt = String(
      row?.assignedAt ?? row?.createdAt ?? row?.updatedAt ?? new Date().toISOString()
    );
    return {
      id,
      name: String(b?.name ?? `Badge #${id}`),
      type: String(b?.type ?? "STAMP"),
      criteria: b?.criteria ?? null,
      assignedAt,
      childId: Number.isFinite(childId) ? childId : undefined,
      childName: row?.child?.name ?? row?.childName ?? undefined,
    };
  });
}

/* ---------------- API: catálogo ---------------- */

/** Lista o catálogo de insígnias. Se falhar, devolve []. */
export async function listBadges(): Promise<Badge[]> {
  try {
    const res = await http<any[]>({ url: "/badges", method: "GET" });
    return (Array.isArray(res) ? res : []).map((b: any): Badge => ({
      id: Number(b?.id),
      name: String(b?.name),
      type: String(b?.type),
      criteria: b?.criteria ?? null,
    }));
  } catch {
    return [];
  }
}

/* --------- Atribuições por criança (compat) ---------- */

/** Lista atribuições de insígnias para uma criança. */
export async function listBadgeAssignments(childId: number): Promise<BadgeAssignment[]> {
  const data = await http<any[]>({
    url: "/badge-assignments",
    method: "GET",
    params: paramsOf({ childId }),
  });
  return (Array.isArray(data) ? data : []).map((a: any): BadgeAssignment => ({
    badgeId: Number(a?.badgeId ?? a?.badge?.id),
    childId: Number(a?.childId),
    assignedAt: String(
      a?.assignedAt ?? a?.assigned_at ?? a?.createdAt ?? new Date().toISOString()
    ),
    badge: a?.badge
      ? {
          id: Number(a.badge.id),
          name: String(a.badge.name),
          type: String(a.badge.type),
          criteria: a.badge.criteria ?? null,
        }
      : undefined,
  }));
}

/* ------------ Atribuições filtradas (child/family) -------- */

/** Lista atribuições com filtros (childId/familyId/limit/order). */
async function listBadgeAssignmentsFiltered(params: {
  childId?: number;
  familyId?: number;
  limit?: number;
  order?: "asc" | "desc";
}): Promise<BadgeLite[]> {
  const data = await http<any[]>({
    url: "/badge-assignments",
    method: "GET",
    params: paramsOf(params),
  });
  return normalizeRecent(data);
}

/* ---------------- Conquistas recentes (landing) ---------------- */

/**
 * Conquistas recentes:
 * - usa /badge-assignments (sem endpoint /recent)
 * - prioriza childId sobre familyId
 * - ordena por assignedAt desc e limita localmente
 */
export async function getBadgesRecent(
  limit = 12,
  opts?: { familyId?: number; childId?: number }
): Promise<BadgeLite[]> {
  const baseLimit = Math.max(limit, 60);
  const items = await listBadgeAssignmentsFiltered({
    childId: Number.isFinite(opts?.childId as number) ? Number(opts!.childId) : undefined,
    familyId: Number.isFinite(opts?.familyId as number) ? Number(opts!.familyId) : undefined,
    limit: baseLimit,
    order: "desc",
  });
  return items
    .sort(
      (a, b) =>
        new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime()
    )
    .slice(0, limit);
}
