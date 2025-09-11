// apps/mobile/src/lib/http.ts
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL =
  (Constants?.expoConfig?.extra as any)?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3333/api';

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // <— importante (cookies)
  headers: { 'Content-Type': 'application/json' },
});

// Helpers tipados se quiseres
export async function get<T = any>(url: string, params?: any) {
  const res = await http.get<T>(url, { params });
  return res.data;
}
export async function post<T = any>(url: string, body?: any) {
  const res = await http.post<T>(url, body);
  return res.data;
}
export async function patch<T = any>(url: string, body?: any) {
  const res = await http.patch<T>(url, body);
  return res.data;
}
export async function del<T = any>(url: string) {
  const res = await http.delete<T>(url);
  return res.data;
}
