// apps/web/src/services/reservation.ts
import { api } from "./https";

// ⬇️ só enviamos childId (o endpoint não aceita familyId)
export async function reserveBook(
  isbn: string,
  ctx: { childId: number }
): Promise<{ ok: boolean; id: number; reservedAt: string }> {
  const qs = new URLSearchParams();
  if (ctx.childId != null) qs.set("childId", String(ctx.childId));
  const url = `/reservations?${qs.toString()}`;
  return api(url, { method: "POST", data: { isbn } });
}

// opcional: helper com assinatura estilo mobile
export const reserveBookForChild = (childId: number, isbn: string) =>
  reserveBook(isbn, { childId });
