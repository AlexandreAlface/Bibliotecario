/**
 * Alexandre Brrissos 21131
 * Descrição: Serviços de gestão de bibliotecários (criar+associar e remover).
 *            Usa o cliente HTTP central (axios) com cookies.
 */
import { http } from "@/services/https";
import type { LibrarianLite } from "./admin";

export type CreateLibrarianPayload = {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
};

/**
 * Cria (ou reaproveita) um utilizador como bibliotecário e associa-o à biblioteca.
 */
export async function createLibrarianAndAssign(
  libraryId: number,
  data: CreateLibrarianPayload
): Promise<LibrarianLite> {
  return http<LibrarianLite>({
    url: `/admin/libraries/${libraryId}/librarians/new`,
    method: "POST",
    data,
  });
}

/**
 * Remove um bibliotecário de uma biblioteca.
 */
export async function removeLibrarianFromLibrary(
  libraryId: number,
  userId: number
): Promise<void> {
  await http<void>({
    url: `/admin/libraries/${libraryId}/librarians/${userId}`,
    method: "DELETE",
  });
}
