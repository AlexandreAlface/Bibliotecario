// apps/web/src/services/auth.ts
import { api } from './https';

export type WebChild = { id: number; name: string; avatarUrl?: string | null };

export type WebUser = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  children?: WebChild[];
  actingChild?: WebChild | null;
};

function normalizeChild(raw: any): WebChild {
  return {
    id: Number(raw?.id ?? raw?.childId ?? raw?.kidId ?? 0),
    name: String(raw?.name ?? raw?.fullName ?? raw?.nome ?? 'Sem nome'),
    avatarUrl: raw?.avatarUrl ?? raw?.avatar ?? null,
  };
}

function normalizeUser(raw: any): WebUser {
  const fullName =
    raw?.fullName ??
    raw?.name ??
    [raw?.firstName, raw?.lastName].filter(Boolean).join(' ') ??
    'Família';

  const childrenArr =
    raw?.children ??
    raw?.kids ??
    raw?.filhos ??
    raw?.dependents ??
    raw?.profiles ??
    [];

  const acting =
    raw?.actingChild ??
    raw?.currentChild ??
    raw?.childContext ??
    null;

  return {
    id: Number(raw?.id ?? raw?.userId ?? 0),
    fullName: String(fullName || 'Família'),
    email: String(raw?.email ?? ''),
    roles: (raw?.roles ?? raw?.perfis ?? []).map((r: any) => String(r)),
    children: Array.isArray(childrenArr) ? childrenArr.map(normalizeChild) : [],
    actingChild: acting ? normalizeChild(acting) : null,
  };
}

// -- API helpers --------------------------------------------------------------

export async function getMe(): Promise<WebUser> {
  const { data } = await api.get('/auth/me');
  return normalizeUser(data ?? {});
}

export async function login(email: string, password: string) {
  await api.post('/auth/login', { email, password });
  return getMe();
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function actAsChild(childId: number): Promise<WebUser> {
  // tenta rota atual; se 404, tenta alternativas comuns
  try {
    await api.post('/auth/act-as-child', { childId });
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try { await api.post('/auth/child/activate', { childId }); }
      catch { await api.post('/family/act-as', { childId }); }
    } else { throw e; }
  }
  return getMe();
}

export async function clearActingChild(): Promise<WebUser> {
  try {
    await api.post('/auth/act-as-clear');
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try { await api.post('/auth/child/clear'); }
      catch { await api.post('/family/act-as/clear'); }
    } else { throw e; }
  }
  return getMe();
}

// aliases, se usas noutros sítios
export const meSvc = getMe;
export const loginSvc = login;
export const logoutSvc = logout;
