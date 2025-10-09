/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de reservas de livros. O endpoint aceita `childId` por querystring
 *            e o `isbn` no corpo do POST. Usa cliente HTTP central com cookies.
 */
import { http } from "./https";

export type ReserveResult = {
  ok: boolean;
  id: number;
  reservedAt: string;
};

/** Constrói querystring ignorando valores nulos/undefined/vazios. */
function qs(params: Record<string, unknown>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/**
 * Reserva um livro para a criança indicada.
 * @param isbn ISBN do livro a reservar.
 * @param ctx  Contexto com `childId` (o endpoint não aceita `familyId`).
 * @returns Objeto normalizado com `ok`, `id`, `reservedAt`.
 */
export async function reserveBook(
  isbn: string,
  ctx: { childId: number }
): Promise<ReserveResult> {
  const url = `/reservations${qs({ childId: ctx.childId })}`;
  const res = await http<{ id: number; reservedAt: string; ok?: boolean }>({
    url,
    method: "POST",
    data: { isbn },
  });
  return { ok: res.ok ?? true, id: res.id, reservedAt: res.reservedAt };
}

/** Atalho estilo mobile: primeiro `childId`, depois `isbn`. */
export const reserveBookForChild = (childId: number, isbn: string) =>
  reserveBook(isbn, { childId });
