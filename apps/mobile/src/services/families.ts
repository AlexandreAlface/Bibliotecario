import { request } from "./api";
import type { UserMe } from "src/types";

export const familiesApi = {
  me: () => request<UserMe>("/auth/me", { method: "GET" }),
  updateMe: (data: Partial<Pick<UserMe, "fullName" | "phone" | "address">>) =>
    request("/users/me", { method: "PATCH", json: data }),
  createChild: (data: {
    name: string;
    birthDate: string;
    gender?: "M" | "F" | null;
    readerProfile?: string | null;
  }) => request("/children", { method: "POST", json: data }),
  updateChild: (
    id: number,
    data: {
      name: string;
      birthDate: string;
      gender?: "M" | "F" | null;
      readerProfile?: string | null;
    }
  ) => request(`/children/${id}`, { method: "PATCH", json: data }),
  deleteChild: (id: number) => request(`/children/${id}`, { method: "DELETE" }),
};
