import Constants from 'expo-constants';

const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3333/api';

type FetchInit = RequestInit & { json?: any };

async function request(path: string, init: FetchInit = {}) {
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
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

export const authApi = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', json: { email, password } }),

  me: () => request('/auth/me', { method: 'GET' }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  actAsChild: (childId: number) =>
    request('/auth/act-as-child', { method: 'POST', json: { childId } }),

  clearActingChild: () =>
    request('/auth/act-as-clear', { method: 'POST' }),
};
