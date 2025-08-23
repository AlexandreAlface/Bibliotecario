import { api } from "./https";

/** Cria uma reserva para o utilizador (family) resolvido pelo childId (ou auth) */
export async function reserveBook(
  isbn: string,
  opts?: { childId?: number; familyId?: number }
): Promise<{ ok: boolean; id: number; reservedAt: string }> {
  const qs = new URLSearchParams();
  if (opts?.childId) qs.set("childId", String(opts.childId));
  if (opts?.familyId) qs.set("familyId", String(opts.familyId));
  const url = `/reservations${qs.toString() ? `?${qs.toString()}` : ""}`;
  return api(url, { method: "POST", data: { isbn } });
}
