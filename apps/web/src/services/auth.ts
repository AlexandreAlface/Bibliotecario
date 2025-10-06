/**
 * Alexandre Brrissos 21131
 * Descrição: Modelos e utilitários de sessão/utente (user/child), normalização de
 *            payloads vindos da API e helpers de autenticação/acting child.
 */
import { http, isApiError } from "./https";

// ----------------- Tipos -----------------
export type WebChild = {
  id: number;
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  readerProfile?: string | null;
  avatarUrl?: string | null;
};

export type WebUser = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  children?: WebChild[];
  actingChild?: WebChild | null;
  phone?: string | null;
  citizenCard?: string | null;
  address?: string | null;
};

// ----------------- Helpers de roles/rotas -----------------
/** Remove acentos para comparação canónica. */
function stripDiacritics(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
/** Uppercase + sem acentos + trim. */
export function canonicalizeRole(role: string): string {
  return stripDiacritics(role).toUpperCase().trim();
}
export function hasRole(user: WebUser | null | undefined, ...roles: string[]) {
  if (!user?.roles) return false;
  const set = new Set(user.roles.map(canonicalizeRole));
  return roles.map(canonicalizeRole).some((r) => set.has(r));
}
export const isLibrarian = (u?: WebUser | null) =>
  hasRole(u, "LIBRARIAN", "BIBLIOTECARIO", "BIBLIOTECÁRIO");
export const isFamily = (u?: WebUser | null) =>
  hasRole(u, "FAMILY", "FAMILIA", "FAMÍLIA");
export const isAdmin = (u?: WebUser | null) => hasRole(u, "ADMIN");

/** Escolhe rota inicial consoante roles conhecidas. */
export function pickLandingRoute(user: any) {
  if (hasAnyRole(user, "ADMIN", "ADMINISTRADOR", "ADMINISTRATOR", "ROLE_ADMIN"))
    return "/admin";
  if (hasAnyRole(user, "LIBRARIAN", "BIBLIOTECARIO", "BIBLIOTECÁRIO"))
    return "/librarian/consultas/pendentes";
  return "/";
}

// ----------------- Normalizadores -----------------
/** Normaliza um perfil de criança da API para WebChild. */
function normalizeChild(raw: any): WebChild {
  return {
    id: Number(raw?.id ?? raw?.childId ?? raw?.kidId ?? 0),
    name: String(raw?.name ?? raw?.fullName ?? raw?.nome ?? "Sem nome"),
    avatarUrl: raw?.avatarUrl ?? raw?.avatar ?? null,
    birthDate: raw?.birthDate ?? raw?.dataNascimento ?? null,
    gender: raw?.gender ?? raw?.sexo ?? null,
    readerProfile:
      raw?.readerProfile ?? raw?.profileText ?? raw?.perfilLeitor ?? null,
  };
}

/** Extrai nome completo de várias formas possíveis. */
function extractFullName(raw: any): string {
  const composed = [raw?.firstName, raw?.lastName].filter(Boolean).join(" ");
  const fullName = raw?.fullName ?? raw?.name ?? (composed || "Família");
  return fullName;
}

/** Extrai/normaliza array de roles. */
function extractRoles(raw: any): string[] {
  const rolesSrc =
    raw?.roles ?? raw?.userRoles ?? raw?.perfis ?? raw?.roles?.items ?? [];
  const list = Array.isArray(rolesSrc) ? rolesSrc : [];
  return list
    .map((r: any) => String(r?.name ?? r?.role?.name ?? r).trim())
    .filter(Boolean);
}

/** Extrai e normaliza os filhos perfis. */
function extractChildren(raw: any): WebChild[] {
  const src =
    raw?.children ??
    raw?.childFamilies ??
    raw?.kids ??
    raw?.filhos ??
    raw?.dependents ??
    raw?.profiles ??
    [];
  return Array.isArray(src)
    ? src.map((c: any) => normalizeChild(c?.child ?? c?.profile ?? c))
    : [];
}

/** Extrai acting child se existir. */
function extractActingChild(raw: any): WebChild | null {
  const acting = raw?.actingChild ?? raw?.currentChild ?? raw?.childContext;
  return acting ? normalizeChild(acting) : null;
}

/** Normaliza o objeto user principal. */
function normalizeUser(raw: any): WebUser {
  return {
    id: Number(raw?.id ?? raw?.userId ?? 0),
    fullName: extractFullName(raw),
    email: String(raw?.email ?? ""),
    roles: extractRoles(raw),
    children: extractChildren(raw),
    actingChild: extractActingChild(raw),
    phone:
      raw?.phone ?? raw?.telefone ?? raw?.mobile ?? raw?.phoneNumber ?? null,
    citizenCard:
      raw?.citizenCard ?? raw?.cartaoCidadao ?? raw?.cc ?? raw?.nif ?? null,
    address: raw?.address ?? raw?.morada ?? null,
  };
}

/** Conjunto de nomes de roles normalizados (sem acentos, upper). */
export function normalizeRoleNames(user: any): string[] {
  const set = new Set<string>();
  const add = (v: any) => {
    if (!v) return;
    const s = String(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
    if (s) set.add(s);
  };
  const pushArr = (arr: any[], pick: (x: any) => any) =>
    arr.forEach((x) => add(pick(x)));
  if (Array.isArray(user?.roles))
    pushArr(user.roles, (r) =>
      typeof r === "string" ? r : r?.name ?? r?.role ?? r
    );
  if (Array.isArray(user?.userRoles))
    pushArr(user.userRoles, (ur) => ur?.role?.name ?? ur?.roleName ?? ur?.name);
  if (Array.isArray(user?.roles?.items))
    pushArr(user.roles.items, (r) =>
      typeof r === "string" ? r : r?.name ?? r
    );
  return Array.from(set);
}

/** True se o user tiver alguma role pedida (com aliases). */
export function hasAnyRole(user: any, ...wanted: string[]) {
  const roles = normalizeRoleNames(user);
  const W = new Set(wanted.map((w) => canonicalizeRole(w)));
  const alias: Record<string, string> = {
    BIBLIOTECARIO: "LIBRARIAN",
    FAMILIA: "FAMILY",
    ADMINISTRADOR: "ADMIN",
    ADMINISTRATOR: "ADMIN",
    ROLE_ADMIN: "ADMIN",
  };
  return roles.some((r) => W.has(r) || (alias[r] && W.has(alias[r])));
}

// ----------------- API helpers -----------------
/** Converte string vazia em null para evitar lixo no servidor. */
const canon = (v: any) => (v === "" ? null : v);

/**
 * Atualiza os dados do próprio utilizador e devolve objeto normalizado.
 */
export async function updateMe(patch: {
  fullName?: string;
  email?: string;
  phone?: string | null;
  citizenCard?: string | null;
  address?: string | null;
}): Promise<WebUser> {
  const data = await http<any>({
    url: "/users/me",
    method: "PATCH",
    data: {
      fullName: patch.fullName,
      email: patch.email,
      phone: canon(patch.phone),
      citizenCard: canon(patch.citizenCard),
      address: canon(patch.address),
    },
  });
  return normalizeUser(data ?? {});
}

/**
 * Obtém o utilizador autenticado (ou null se 401).
 */
export async function getMe(): Promise<WebUser | null> {
  try {
    const data = await http<any>({ url: "/auth/me", method: "GET" });
    return normalizeUser(data ?? {});
  } catch (e: any) {
    if (isApiError(e) && e.status === 401) return null;
    throw e;
  }
}

/** Autentica por email/password e devolve a sessão atual. */
export async function login(email: string, password: string) {
  await http<void>({
    url: "/auth/login",
    method: "POST",
    data: { email, password },
  });
  return getMe();
}

/** Termina sessão. */
export async function logout() {
  await http<void>({ url: "/auth/logout", method: "POST" });
}

/**
 * Define o "acting child" na sessão. Tenta endpoint padrão e alternativas.
 */
export async function actAsChild(childId: number): Promise<WebUser | null> {
  const tryPost = async (url: string, data?: any) => {
    try {
      await http<void>({ url, method: "POST", data });
      return true;
    } catch (e: any) {
      if (isApiError(e) && e.status === 404) return false;
      throw e;
    }
  };

  if (await tryPost("/auth/act-as-child", { childId })) return getMe();
  if (await tryPost("/auth/child/activate", { childId })) return getMe();
  await http<void>({
    url: "/family/act-as",
    method: "POST",
    data: { childId },
  });
  return getMe();
}

/**
 * Limpa o "acting child" atual. Tenta endpoint padrão e alternativas.
 */
export async function clearActingChild(): Promise<WebUser | null> {
  const tryPost = async (url: string) => {
    try {
      await http<void>({ url, method: "POST" });
      return true;
    } catch (e: any) {
      if (isApiError(e) && e.status === 404) return false;
      throw e;
    }
  };

  if (await tryPost("/auth/act-as-clear")) return getMe();
  if (await tryPost("/auth/child/clear")) return getMe();
  await http<void>({ url: "/family/act-as/clear", method: "POST" });
  return getMe();
}

// Aliases convenientes mantendo API atual
export const meSvc = getMe;
export const loginSvc = login;
export const logoutSvc = logout;
