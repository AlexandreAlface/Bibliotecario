import { type LibrarianLite } from "@/services/admin";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3333/api";

type CreateLibrarianPayload = {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

/** Cria (ou reaproveita) um utilizador como bibliotecário e associa à biblioteca. */
export async function createLibrarianAndAssign(
  libraryId: number,
  data: CreateLibrarianPayload
): Promise<LibrarianLite> {
  const res = await fetch(
    `${API_BASE}/admin/libraries/${libraryId}/librarians/new`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );
  return j<LibrarianLite>(res);
}

export async function removeLibrarianFromLibrary(
  libraryId: number,
  userId: number
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/libraries/${libraryId}/librarians/${userId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Falha ao remover bibliotecário.");
  }
}
