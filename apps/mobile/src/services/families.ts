// src/services/families.ts
import { request } from "./api";

/** Tipos partilhados pelo serviço de famílias */
export type Gender = "M" | "F" | "O" | null;

export type Child = {
  id: number;
  name: string;
  birthDate: string; // ISO
  gender?: Gender;
  readerProfile?: string | null;
};

export type UserMe = {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  children: Child[];
  // o /auth/me devolve também roles/actingChild — não precisamos aqui,
  // e o request vai ignorar as chaves extra.
};

export type UpdateMeInput = {
  fullName: string;
  phone?: string;
  address?: string;
};

export type ChildCreateInput = {
  name: string;
  birthDate: string; // ISO
  gender?: Gender; // inclui "O" (Outro)
  readerProfile?: string | null;
};

export type ChildUpdateInput = ChildCreateInput;

/** Endpoints (alinhados com as tuas rotas Express) */
export const familiesApi = {
  // Informação do utilizador autenticado + crianças detalhadas
  // GET /api/auth/me
  me: () => request<UserMe>("/auth/me", { method: "GET" }),

  // Atualizar perfil do utilizador (família)
  // PATCH /api/users/me
  updateMe: (data: UpdateMeInput) =>
    request("/users/me", { method: "PATCH", json: data }),

  // Criar criança
  // POST /api/children
  createChild: (data: ChildCreateInput) =>
    request("/children", { method: "POST", json: data }),

  // Atualizar criança
  // PATCH /api/children/:id
  updateChild: (id: number, data: ChildUpdateInput) =>
    request(`/children/${id}`, { method: "PATCH", json: data }),

  // Apagar criança
  // DELETE /api/children/:id
  deleteChild: (id: number) => request(`/children/${id}`, { method: "DELETE" }),
};
