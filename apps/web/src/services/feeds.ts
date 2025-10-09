/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço de Feeds (listar/CRUD) scoped à biblioteca do utilizador.
 *            Usa o cliente HTTP central (axios) com cookies e erros normalizados.
 */
import { http, isApiError } from "./https";

export type FeedLite = {
  id: number;
  url: string;
  ttl?: number | null;
  lastBuildDate?: string | null;
};

export type LibraryLite = { id: number; name: string };

/* ---------------- Helpers ---------------- */

/** Remove props undefined (mantém null/0/false). */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) o[k] = v;
  return o as Partial<T>;
}

/* ---------------- API ---------------- */

/** Devolve a biblioteca associada ao utilizador (primeira associação) ou null se 404. */
export async function getMyLibrary(): Promise<LibraryLite | null> {
  try {
    return await http<LibraryLite>({
      url: "/admin/feeds/my-library",
      method: "GET",
    });
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null;
    throw e;
  }
}

/** (Opcional/legacy) Listar bibliotecas por métricas – pode não existir no backend atual. */
export async function listMyLibraries(): Promise<LibraryLite[]> {
  return http<LibraryLite[]>({
    url: "/admin/metrics/libraries",
    method: "GET",
  });
}

/** Lista feeds da biblioteca (scoped). */
export async function listFeeds(libraryId: number): Promise<FeedLite[]> {
  return http<FeedLite[]>({
    url: `/admin/libraries/${libraryId}/feeds`,
    method: "GET",
  });
}

/** Adiciona feed na biblioteca (scoped). */
export async function addFeed(args: {
  libraryId: number;
  url: string;
  ttl?: number | null;
}): Promise<FeedLite> {
  return http<FeedLite>({
    url: `/admin/libraries/${args.libraryId}/feeds`,
    method: "POST",
    data: clean({ url: args.url, ttl: args.ttl }),
  });
}

/** Atualiza feed (endpoint legacy por ID). */
export async function updateFeed(
  id: number,
  patch: { url?: string; ttl?: number | null }
): Promise<FeedLite> {
  return http<FeedLite>({
    url: `/admin/feeds/${id}`,
    method: "PATCH",
    data: clean(patch),
  });
}

/** Remove feed (endpoint legacy por ID). */
export async function removeFeed(id: number): Promise<void> {
  await http<void>({ url: `/admin/feeds/${id}`, method: "DELETE" });
}
