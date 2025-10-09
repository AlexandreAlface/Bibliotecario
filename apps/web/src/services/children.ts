/**
 * Alexandre Brrissos 21131
 * Descrição: Serviço para criar/atualizar/apagar crianças (perfis dependentes).
 *            Usa cliente HTTP central (axios) e faz fallback entre endpoints legacy.
 */
import { http, isApiError } from "./https";

export type Child = {
  id: number;
  name: string;
  birthDate?: string | null; // ISO (YYYY-MM-DD)
  gender?: string | null;
  readerProfile?: string | null;
  avatarUrl?: string | null;
};

export type ChildInput = {
  name: string;
  birthDate?: string | Date | null; // aceita Date; envia YYYY-MM-DD
  gender?: string | null;
  readerProfile?: string | null;
};

/** Converte Date -> 'YYYY-MM-DD'; strings passam direto; null mantém. */
function toDateOnly(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  try {
    return v.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** Normaliza payload vindo da API para o modelo Child. */
function normalizeChild(raw: any): Child {
  return {
    id: Number(raw?.id ?? raw?.childId ?? 0),
    name: String(raw?.name ?? raw?.fullName ?? "Sem nome"),
    birthDate: raw?.birthDate ? String(raw.birthDate).slice(0, 10) : null,
    gender: raw?.gender ?? null,
    readerProfile: raw?.readerProfile ?? null,
    avatarUrl: raw?.avatarUrl ?? null,
  };
}

/** Tenta uma sequência de endpoints até um resultar (ignora 404). */
async function requestFirst<T>(
  method: "POST" | "PATCH" | "DELETE",
  urls: string[],
  data?: any
): Promise<T> {
  let lastErr: unknown;
  for (const url of urls) {
    try {
      return await http<T>({ url, method, data });
    } catch (e) {
      if (isApiError(e) && e.status === 404) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("Nenhum endpoint disponível.");
}

/**
 * Cria uma criança. Tenta `/children`, depois `/family/children`, depois `/kids`.
 */
export async function createChild(input: ChildInput): Promise<Child> {
  const payload = { ...input, birthDate: toDateOnly(input.birthDate) };
  const res = await requestFirst<any>(
    "POST",
    ["/children", "/family/children", "/kids"],
    payload
  );
  return normalizeChild(res);
}

/**
 * Atualiza uma criança. Tenta `/children/:id`, depois `/child/:id`, depois `/kids/:id`.
 */
export async function updateChild(
  childId: number,
  input: ChildInput
): Promise<Child> {
  const payload = { ...input, birthDate: toDateOnly(input.birthDate) };
  const res = await requestFirst<any>(
    "PATCH",
    [`/children/${childId}`, `/child/${childId}`, `/kids/${childId}`],
    payload
  );
  return normalizeChild(res);
}

/**
 * Apaga uma criança. Tenta `/children/:id`, depois `/child/:id`, depois `/kids/:id`.
 */
export async function deleteChild(childId: number): Promise<void> {
  await requestFirst<void>("DELETE", [
    `/children/${childId}`,
    `/child/${childId}`,
    `/kids/${childId}`,
  ]);
}
