// src/services/api.ts
import Constants from "expo-constants";

export const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3333/api";

export type FetchInit = RequestInit & { json?: any };

export async function request<T = any>(path: string, init: FetchInit = {}) {
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

  if (!res.ok) {
    const msg = data?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
