import { request } from "./api";

export async function reserveBook(
  isbn: string,
  opts: { childId?: number; familyId?: number } = {}
): Promise<{ ok: boolean; id: number; reservedAt: string }> {
  const qs = new URLSearchParams();
  if (opts.childId) qs.set("childId", String(opts.childId));
  if (opts.familyId) qs.set("familyId", String(opts.familyId));
  const url = `/reservations${qs.toString() ? `?${qs.toString()}` : ""}`;
  return request(url, { method: "POST", json: { isbn } });
}
