import { request } from "./api";

export type SimpleUser = { id: number; name: string };

function toQuery(params: Record<string, any>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
  return q ? `?${q}` : "";
}

export const usersApi = {
  listLibrarians: (params?: { libraryId?: number }) =>
    request<SimpleUser[]>(`/consultations/librarians${toQuery(params ?? {})}`, {
      method: "GET",
    }),

  listLibrariansWithOpenSlots: (params: {
    from: string;
    to: string;
    libraryId?: number;
  }) =>
    request<SimpleUser[]>(
      `/consultations/librarians/with-open-slots${toQuery(params)}`,
      { method: "GET" }
    ),
};
