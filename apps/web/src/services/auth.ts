import { api } from "./https";

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

// ----------------- Helpers -----------------
function stripDiacritics(s: string): string {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
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

export function pickLandingRoute(user: any) {
  if (hasAnyRole(user, "ADMIN", "ADMINISTRADOR", "ADMINISTRATOR", "ROLE_ADMIN"))
    return "/admin";
  if (hasAnyRole(user, "LIBRARIAN", "BIBLIOTECARIO", "BIBLIOTECÁRIO"))
    return "/librarian/consultas/pendentes";
  return "/";
}

// ----------------- Normalizadores -----------------
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

function normalizeUser(raw: any): WebUser {
  const fullName =
    raw?.fullName ??
    raw?.name ??
    [raw?.firstName, raw?.lastName].filter(Boolean).join(" ") ??
    "Família";

  const rawRoles =
    raw?.roles ??
    raw?.userRoles ??
    raw?.perfis ??
    [];
  const roles = Array.isArray(rawRoles)
    ? rawRoles
        .map((r: any) => String(r?.name ?? r?.role?.name ?? r))
        .filter(Boolean)
    : [];

  const rawChildren =
    raw?.children ??
    raw?.childFamilies ??
    raw?.kids ??
    raw?.filhos ??
    raw?.dependents ??
    raw?.profiles ??
    [];
  const children = Array.isArray(rawChildren)
    ? rawChildren.map((c: any) => normalizeChild(c?.child ?? c?.profile ?? c))
    : [];

  const actingRaw =
    raw?.actingChild ?? raw?.currentChild ?? raw?.childContext ?? null;

  const phone =
    raw?.phone ?? raw?.telefone ?? raw?.mobile ?? raw?.phoneNumber ?? null;
  const citizenCard =
    raw?.citizenCard ?? raw?.cartaoCidadao ?? raw?.cc ?? raw?.nif ?? null;
  const address = raw?.address ?? raw?.morada ?? null;

  return {
    id: Number(raw?.id ?? raw?.userId ?? 0),
    fullName: String(fullName || "Família"),
    email: String(raw?.email ?? ""),
    roles,
    children,
    actingChild: actingRaw ? normalizeChild(actingRaw) : null,
    phone,
    citizenCard,
    address,
  };
}

export function normalizeRoleNames(user: any): string[] {
  const set = new Set<string>();
  const add = (v: any) => {
    if (!v) return;
    const s = String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    if (s) set.add(s);
  };

  if (Array.isArray(user?.roles)) {
    for (const r of user.roles)
      add(typeof r === "string" ? r : r?.name ?? r?.role ?? r);
  }
  if (Array.isArray(user?.userRoles)) {
    for (const ur of user.userRoles)
      add(ur?.role?.name ?? ur?.roleName ?? ur?.name);
  }
  if (Array.isArray(user?.roles?.items)) {
    for (const r of user.roles.items)
      add(typeof r === "string" ? r : r?.name ?? r);
  }

  return Array.from(set);
}

export function hasAnyRole(user: any, ...wanted: string[]) {
  const roles = normalizeRoleNames(user);
  const W = new Set(
    wanted.map((w) =>
      String(w).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()
    )
  );
  const alias: Record<string, string> = {
    BIBLIOTECARIO: "LIBRARIAN",
    FAMILIA: "FAMILY",
    ADMINISTRADOR: "ADMIN",
    ADMINISTRATOR: "ADMIN",
    ROLE_ADMIN: "ADMIN",
  };
  return roles.some((r) => W.has(r) || (alias[r] && W.has(alias[r])));
}

// -- API helpers --------------------------------------------------------------
export async function updateMe(patch: {
  fullName?: string;
  email?: string;
  phone?: string | null;
  citizenCard?: string | null;
  address?: string | null;
}): Promise<WebUser> {
  const canon = (v: any) => (v === "" ? null : v);
  const { data } = await api.patch("/users/me", {
    fullName: patch.fullName,
    email: patch.email,
    phone: canon(patch.phone),
    citizenCard: canon(patch.citizenCard),
    address: canon(patch.address),
  });
  return normalizeUser(data ?? {});
}

export async function getMe(): Promise<WebUser | null> {
  try {
    const { data } = await api.get("/auth/me");
    return normalizeUser(data ?? {});
  } catch (e: any) {
    if (e?.response?.status === 401) return null;
    throw e;
  }
}

export async function login(email: string, password: string) {
  await api.post("/auth/login", { email, password });
  return getMe();
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function actAsChild(childId: number): Promise<WebUser | null> {
  try {
    await api.post("/auth/act-as-child", { childId });
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try {
        await api.post("/auth/child/activate", { childId });
      } catch {
        await api.post("/family/act-as", { childId });
      }
    } else {
      throw e;
    }
  }
  return getMe();
}

export async function clearActingChild(): Promise<WebUser | null> {
  try {
    await api.post("/auth/act-as-clear");
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try {
        await api.post("/auth/child/clear");
      } catch {
        await api.post("/family/act-as/clear");
      }
    } else {
      throw e;
    }
  }
  return getMe();
}

export const meSvc = getMe;
export const loginSvc = login;
export const logoutSvc = logout;
