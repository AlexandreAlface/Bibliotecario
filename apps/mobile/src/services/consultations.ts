import { request } from "./api";

export type ConsultationLite = {
  id: number;
  title?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  childName?: string | null;
  librarianName?: string | null;
  libraryName?: string | null;
};

export type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "CANCELLED";
  librarianId: number;
  librarianName?: string | null;
  libraryId?: number | null;
  libraryName?: string | null;
  librarianAvatarUrl?: string | null;
};

// helper simples de query-string

function toQuery(params: Record<string, any>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) =>
      Array.isArray(v)
        ? v
            .map(
              (vv) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(String(vv))}`
            )
            .join("&")
        : `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");
  return q ? `?${q}` : "";
}

export const consultationsApi = {
  listAll: (params: {
    familyId?: number;
    childId?: number;
    status?: string;
    from?: string;
    to?: string;
    order?: "asc" | "desc";
    limit?: number;
    librarianId?: number;
  }) =>
    request<ConsultationLite[]>(`/consultations/all${toQuery(params)}`, {
      method: "GET",
    }),

  searchSlots: (params: {
    from: string;
    to: string;
    librarianId?: number;
    libraryId?: number;
  }) =>
    request<Slot[]>(
      `/consultations/slots${toQuery({ ...params, onlyBookable: true })}`, // ⬅️ força bookable
      { method: "GET" }
    ),

  slotsByLibrarian: (
    librarianId: number,
    params: { from: string; to: string }
  ) =>
    request<Slot[]>(
      `/consultations/librarians/${librarianId}/slots${toQuery({
        from: params.from,
        to: params.to,
      })}`,
      { method: "GET" }
    ),

  create: (data: {
    familyId: number;
    childId: number;
    slotId: number;
    librarianId: number;
  }) => request("/consultations", { method: "POST", json: data }),
};
