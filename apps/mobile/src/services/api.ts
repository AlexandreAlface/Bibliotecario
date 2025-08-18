// src/services/api.ts
import Constants from 'expo-constants';

export const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3333/api';

type FetchInit = RequestInit & { json?: any };

export async function api<T = any>(path: string, init: FetchInit = {}) {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: json ? JSON.stringify(json) : (rest as any).body,
    ...rest,
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}
