// apps/mobile/src/services/reservations.ts
import axios from "axios";

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333/api";

export async function reserveBook(
  isbn: string,
  opts: { childId: number }
): Promise<{ ok: boolean; id: number; reservedAt: string }> {
  const qs = new URLSearchParams({ childId: String(opts.childId) });
  const { data } = await axios.post(`${API}/reservations?${qs.toString()}`, { isbn }, { withCredentials: true });
  return data;
}
