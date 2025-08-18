// services/auth.ts
import Constants from "expo-constants";

export const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3333/api";

type FetchInit = RequestInit & { json?: any };

async function request(path: string, init: FetchInit = {}) {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: json ? JSON.stringify(json) : (rest as any).body,
    ...rest,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

export const authApi = {
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", json: { email, password } }),

  registerFamily: (payload: any) =>
    request("/auth/register", { method: "POST", json: payload }),

  me: () => request("/auth/me", { method: "GET" }),
  logout: () => request("/auth/logout", { method: "POST" }),
};

// Tipos úteis
export type FamilySignupDraft = {
  fullName: string;
  email: string;
  phone?: string;
  citizenCard?: string;
  address?: string;
  password: string;
  readerProfile?: string;
};
export type ChildInput = {
  firstName: string;
  lastName?: string;
  birthDate: string; // YYYY-MM-DD
  gender: "M" | "F" | "Outro";
};

// acrescentamos isto:
export type RoleName = "FAMÍLIA" | "CRIANÇA" | "BIBLIOTECÁRIO" | "ADMIN";

export type MeResponse = {
  id: number;
  fullName: string;
  email: string;
  roles: RoleName[];
};
