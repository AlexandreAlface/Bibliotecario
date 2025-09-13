// src/services/badges.ts
import { request } from "./api";

export type Badge = {
  id: number;
  name: string;
  type: string;               // ex.: "SELO" | "TROFÉU"
  criteria?: string | null;
};

export type BadgeAssignment = {
  id: string;                 // `${childId}_${badgeId}`
  childId: number;
  childName?: string | null;
  badgeId: number;
  name?: string | null;
  type?: string | null;
  criteria?: string | null;
  assignedAt?: string | null; // ISO
};

export const badgesApi = {
  listCatalog: () =>
    request<Badge[]>("/badges", { method: "GET" }),

  assignments: (params: {
    familyId?: number;
    childId?: number;
    childIds?: number[];
    limit?: number;
  }) => {
    const qs: string[] = [];
    if (params.familyId) qs.push(`familyId=${encodeURIComponent(params.familyId)}`);
    if (params.childId) qs.push(`childId=${encodeURIComponent(params.childId)}`);
    if (params.childIds?.length) qs.push(`childIds=${encodeURIComponent(params.childIds.join(","))}`);
    if (params.limit) qs.push(`limit=${encodeURIComponent(params.limit)}`);
    const suf = qs.length ? `?${qs.join("&")}` : "";
    return request<BadgeAssignment[]>(`/badge-assignments${suf}`, { method: "GET" });
  },
};
