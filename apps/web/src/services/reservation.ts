import { api } from "./https";

type ReserveCtx = {
  childId?: number;
  familyId?: number;
};

export async function reserveBook(
  isbn: string,
  ctx: ReserveCtx = {}
): Promise<{ ok: boolean; id: number; reservedAt: string }> {
  const qs = new URLSearchParams();
  if (ctx.childId != null) qs.set("childId", String(ctx.childId));
  if (ctx.familyId != null) qs.set("familyId", String(ctx.familyId));

  const query = qs.toString();
  const url = query ? `/reservations?${query}` : "/reservations";

  return api(url, { method: "POST", data: { isbn } });
}
