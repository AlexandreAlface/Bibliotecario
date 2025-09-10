// apps/web/src/services/badges.ts
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
  badge?: Badge; // se a API já incluir o badge
};

export type BadgeLite = {
  id: number; // badgeId
  name: string;
  type: string;
  criteria?: string | null;
  assignedAt?: string; // quando foi atribuído
  childId?: number;
  childName?: string;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

/* ---------------- helpers ---------------- */
function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    s.append(k, String(v));
  }
  return s.toString();
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  if (res.status === 204) return [];
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = raw ? JSON.parse(raw) : {};
      throw new Error(j?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(
        `HTTP ${res.status}${raw ? `: ${raw.slice(0, 160)}` : ""}`
      );
    }
  }
  return raw ? JSON.parse(raw) : [];
}

/* ---------------- API: catálogo ---------------- */
export async function listBadges(): Promise<Badge[]> {
  try {
    const url = `${API_BASE}/badges`;
    const data = await fetchJson(url);
    return (Array.isArray(data) ? data : []).map((b: any) => ({
      id: Number(b.id),
      name: String(b.name),
      type: String(b.type),
      criteria: b.criteria ?? null,
    }));
  } catch {
    return [];
  }
}

/* ---------------- API: assignments por criança (compat) ---------------- */
export async function listBadgeAssignments(
  childId: number
): Promise<BadgeAssignment[]> {
  const url = `${API_BASE}/badge-assignments?${qs({ childId })}`;
  const data = await fetchJson(url);
  return (Array.isArray(data) ? data : []).map((a: any) => ({
    badgeId: Number(a.badgeId ?? a.badge?.id),
    childId: Number(a.childId),
    assignedAt: String(
      a.assignedAt ?? a.assigned_at ?? a.createdAt ?? new Date().toISOString()
    ),
    badge: a.badge
      ? {
          id: Number(a.badge.id),
          name: String(a.badge.name),
          type: String(a.badge.type),
          criteria: a.badge.criteria ?? null,
        }
      : undefined,
  }));
}

/* ------------ API genérica: assignments filtrados (child/family) -------- */
async function listBadgeAssignmentsFiltered(params: {
  childId?: number;
  familyId?: number;
  limit?: number;
  order?: "asc" | "desc";
}): Promise<BadgeLite[]> {
  const url = `${API_BASE}/badge-assignments?${qs(params)}`;
  const data = await fetchJson(url);
  return normalizeRecent(data);
}

/* ---------------- Conquistas recentes (landing) ---------------- */
/**
 * getBadgesRecent
 * - Usa SEMPRE /api/badge-assignments (nada de /recent)
 * - Filtra por childId (prioritário) ou familyId
 * - Ordena por assignedAt desc e limita em memória
 */
export async function getBadgesRecent(
  limit = 12,
  opts?: { familyId?: number; childId?: number }
): Promise<BadgeLite[]> {
  const baseLimit = Math.max(limit, 60);
  const items = await listBadgeAssignmentsFiltered({
    childId: Number.isFinite(opts?.childId as number)
      ? Number(opts!.childId)
      : undefined,
    familyId: Number.isFinite(opts?.familyId as number)
      ? Number(opts!.familyId)
      : undefined,
    limit: baseLimit,
    order: "desc",
  });

  return items
    .sort(
      (a, b) =>
        new Date(b.assignedAt || 0).getTime() -
        new Date(a.assignedAt || 0).getTime()
    )
    .slice(0, limit);
}

/* ---------------- normalizadores ---------------- */
function normalizeRecent(data: any): BadgeLite[] {
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => {
    // Formas possíveis na resposta:
    // A) { badge: {id, name, type, criteria}, assignedAt, child: {id, name} }
    // B) { badgeId, childId, assignedAt, badge, childName }
    // C) { id, name, type, criteria, assignedAt, childId, childName } (lite)
    const b = row.badge ?? row;

    const id = Number(b.id ?? row.badgeId);
    const childId = Number(row.childId ?? row.child?.id);
    const assignedAt = String(
      row.assignedAt ?? row.createdAt ?? row.updatedAt ?? new Date().toISOString()
    );

    return {
      id,
      name: String(b.name ?? `Badge #${id}`),
      type: String(b.type ?? "STAMP"),
      criteria: b.criteria ?? null,
      assignedAt,
      childId: Number.isFinite(childId) ? childId : undefined,
      childName: row.child?.name ?? row.childName ?? undefined,
    } as BadgeLite;
  });
}
