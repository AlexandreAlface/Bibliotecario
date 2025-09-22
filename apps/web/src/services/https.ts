// apps/web/src/services/https.ts
import axios from "axios";

const base =
  (window as any).__API_BASE__ ||
  (import.meta as any).env?.VITE_API_URL ||
  "/api";

export const api = axios.create({
  baseURL: String(base).replace(/\/$/, ""),
  withCredentials: true, // 👈 ESSENCIAL para mandar cookie httpOnly
});

// (opcional) não redireciono aqui; deixo os callers decidirem
api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
);
