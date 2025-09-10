// apps/web/src/services/children.ts
import { api } from "./https";

export type Child = {
  id: number;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  readerProfile?: string | null;
  avatarUrl?: string | null;
};

export type ChildInput = {
  name: string;
  birthDate?: string | null;     // ISO (YYYY-MM-DD ou Date -> ISO)
  gender?: string | null;
  readerProfile?: string | null;
};

function normalizeChild(raw: any): Child {
  return {
    id: Number(raw?.id ?? raw?.childId),
    name: String(raw?.name ?? raw?.fullName ?? "Sem nome"),
    birthDate: raw?.birthDate ? new Date(raw.birthDate).toISOString() : null,
    gender: raw?.gender ?? null,
    readerProfile: raw?.readerProfile ?? null,
    avatarUrl: raw?.avatarUrl ?? null,
  };
}

export async function createChild(input: ChildInput): Promise<Child> {
  try {
    const { data } = await api.post("/children", input);
    return normalizeChild(data);
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try {
        const { data } = await api.post("/family/children", input);
        return normalizeChild(data);
      } catch {
        const { data } = await api.post("/kids", input);
        return normalizeChild(data);
      }
    }
    throw e;
  }
}

export async function updateChild(childId: number, input: ChildInput): Promise<Child> {
  try {
    const { data } = await api.patch(`/children/${childId}`, input);
    return normalizeChild(data);
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try {
        const { data } = await api.patch(`/child/${childId}`, input);
        return normalizeChild(data);
      } catch {
        const { data } = await api.patch(`/kids/${childId}`, input);
        return normalizeChild(data);
      }
    }
    throw e;
  }
}

export async function deleteChild(childId: number): Promise<void> {
  try {
    await api.delete(`/children/${childId}`);
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try { await api.delete(`/child/${childId}`); }
      catch { await api.delete(`/kids/${childId}`); }
    } else {
      throw e;
    }
  }
}
