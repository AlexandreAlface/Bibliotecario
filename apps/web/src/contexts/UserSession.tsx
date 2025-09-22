import React from "react";
import * as auth from "@/services/auth";
import { normalizeRoleNames } from "@/services/auth";
import { useNavigate, useLocation } from "react-router-dom";

// ---- Tipos ----
type ChildLite = {
  id: number;
  name?: string | null;
  avatarUrl?: string | null;
};

type UserLibraryLite = {
  libraryId: number;
  library?: { id: number; name: string };
};

type UserShape = {
  id: number;
  fullName: string;
  email?: string;
  roles: string[];
  children?: ChildLite[];
  phone?: string | null;
  citizenCard?: string | null;
  address?: string | null;
  actingChild?: {
    id: number;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;

  userLibraries?: UserLibraryLite[];
  libraryId?: number;
};

type Ctx = {
  user: UserShape | null;
  loading: boolean;

  isFamily: boolean;
  isLibrarian: boolean;
  isAdmin: boolean;

  currentLibraryId: number | null;

  asChild: boolean;
  currentChildId: number | null;

  selectedChildId: number | null;
  setSelectedChildId: (id: string | number | null | undefined) => Promise<void>;

  refresh: () => Promise<void>;
  actAsChild: (childId: number) => Promise<void>;
  clearChild: () => Promise<void>;
  logout: () => Promise<void>;
};

// ---- Keys de storage ----
const KEY_MODE = "familyMode"; // 'child' | 'family'
const KEY_CHILD_ID = "actingChildId";
type FamilyMode = "child" | "family" | null;

// ---- Safe storage helpers ----
function safeGetSS(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetSS(key: string, val: string | null) {
  try {
    if (val == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, val);
  } catch {}
}
function safeGetLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetLS(key: string, val: string | null) {
  try {
    if (val == null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {}
}

function getPersistedMode(): FamilyMode {
  const v = safeGetSS(KEY_MODE) ?? safeGetLS(KEY_MODE);
  return v === "child" || v === "family" ? v : null;
}
function setPersistedMode(mode: FamilyMode) {
  const v = mode ?? null;
  safeSetSS(KEY_MODE, v);
  safeSetLS(KEY_MODE, v);
  try {
    window.dispatchEvent(new CustomEvent("family-mode-changed", { detail: v }));
  } catch {}
}

function getPersistedChildId(): number | null {
  const v = safeGetSS(KEY_CHILD_ID) ?? safeGetLS(KEY_CHILD_ID);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function setPersistedChildId(id: number | null) {
  const v = id && id > 0 ? String(id) : null;
  safeSetSS(KEY_CHILD_ID, v);
  safeSetLS(KEY_CHILD_ID, v);
}

function hasRole(user: UserShape | null, ...roles: string[]) {
  if (!user) return false;
  const current = new Set(
    (user.roles && user.roles.length
      ? user.roles
      : normalizeRoleNames(user)
    ).map((r) => String(r).toUpperCase())
  );
  return roles.some((r) => {
    const R = String(r).toUpperCase();
    if (R === "ADMIN")
      return (
        current.has("ADMIN") ||
        current.has("ADMINISTRADOR") ||
        current.has("ADMINISTRATOR") ||
        current.has("ROLE_ADMIN")
      );
    if (R === "LIBRARIAN")
      return (
        current.has("LIBRARIAN") ||
        current.has("BIBLIOTECARIO") ||
        current.has("BIBLIOTECÁRIO")
      );
    if (R === "FAMILY")
      return (
        current.has("FAMILY") ||
        current.has("FAMILIA") ||
        current.has("FAMÍLIA")
      );
    return current.has(R);
  });
}

const UserSessionContext = React.createContext<Ctx | null>(null);

// ---- /auth/me ----
async function fetchCurrentUser(): Promise<UserShape | null> {
  const base =
    (import.meta as any).env?.VITE_API_URL ||
    (window as any).__API_BASE__ ||
    "/api";

  const res = await fetch(`${base.replace(/\/$/, "")}/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return null;
    throw new Error(`/auth/me falhou: ${res.status}`);
  }

  const raw = await res.json();
  const roles = normalizeRoleNames(raw);
  const data = { ...(raw as any), roles } as UserShape;
  return data;
}

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserShape | null>(null);
  const [loading, setLoading] = React.useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const prevUserIdRef = React.useRef<number | null>(null);
  const forcedFirstFamilyRef = React.useRef(false);

  const findChild = React.useCallback(
    (me: UserShape | null, id: number | null | undefined): ChildLite | null => {
      if (!me || !me.children || !Number.isFinite(Number(id))) return null;
      const c = me.children.find((x) => Number(x.id) === Number(id));
      return c
        ? { id: c.id, name: c.name ?? null, avatarUrl: c.avatarUrl ?? null }
        : null;
    },
    []
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchCurrentUser();

      const persistedMode = getPersistedMode();
      const persistedId = getPersistedChildId();

      let next = me;

      if (me) {
        const isFam = hasRole(me, "FAMILY", "FAMÍLIA", "FAMILIA");
        const isLib = hasRole(me, "LIBRARIAN", "BIBLIOTECARIO", "BIBLIOTECÁRIO");
        const isAdm = hasRole(me, "ADMIN", "ADMINISTRATOR", "ADMINISTRADOR", "ROLE_ADMIN");
        const isStaff = isLib || isAdm;

        if (isStaff) {
          // staff NUNCA atua como criança
          next = { ...me, actingChild: null };
          setPersistedMode("family");
          setPersistedChildId(null);
        } else if (isFam) {
          // família segue persistência/servidor
          if (persistedMode === "family") {
            next = { ...me, actingChild: null };
          } else if (persistedMode === "child") {
            const child =
              (persistedId && findChild(me, persistedId)) ||
              (me.actingChild ? findChild(me, Number(me.actingChild.id)) : null);
            if (child) {
              next = { ...me, actingChild: child };
              setPersistedChildId(child.id);
            } else {
              setPersistedChildId(null);
              next = { ...me, actingChild: null };
            }
          } else {
            const serverId = Number(me?.actingChild?.id);
            if (Number.isFinite(serverId) && serverId > 0) {
              setPersistedMode("child");
              setPersistedChildId(serverId);
            } else {
              setPersistedMode("family");
              setPersistedChildId(null);
            }
          }
        } else {
          // outros perfis (se existirem): neutral
          next = { ...me, actingChild: null };
          setPersistedMode("family");
          setPersistedChildId(null);
        }
      } else {
        setPersistedMode(null);
        setPersistedChildId(null);
      }

      setUser(next);
    } catch {
      setUser(null);
      setPersistedMode(null);
      setPersistedChildId(null);
    } finally {
      setLoading(false);
    }
  }, [findChild]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function actAsChild(childId: number) {
    // só famílias podem mudar de perfil
    if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) {
      await refresh();
      return;
    }

    setPersistedMode("child");
    setPersistedChildId(childId);

    setUser((prev) => {
      if (!prev) return prev;
      const child = prev.children?.find((c) => Number(c.id) === Number(childId));
      return {
        ...prev,
        actingChild: child
          ? { id: child.id, name: child.name ?? null, avatarUrl: child.avatarUrl ?? null }
          : { id: childId },
      } as UserShape;
    });

    try {
      await (auth as any).actAsChild?.(childId);
    } catch {}
    await refresh();
  }

  async function clearChild() {
    // só famílias usam acting child
    if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) {
      await refresh();
      return;
    }

    setPersistedMode("family");
    setPersistedChildId(null);

    setUser((prev) => (prev ? ({ ...prev, actingChild: null } as UserShape) : prev));

    try {
      if (typeof (auth as any).clearActingChild === "function") {
        await (auth as any).clearActingChild();
      } else if (typeof (auth as any).clearChild === "function") {
        await (auth as any).clearChild();
      }
    } catch {}
    await refresh();
  }

  async function logout() {
    try {
      await (auth as any).logout?.();
    } finally {
      setPersistedMode(null);
      setPersistedChildId(null);
      setUser(null);
    }
  }

  const isFamily = hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA");
  const isLibrarian = hasRole(user, "LIBRARIAN", "BIBLIOTECÁRIO", "BIBLIOTECARIO");
  const isAdmin = hasRole(user, "ADMIN", "ADMINISTRATOR", "ADMINISTRADOR", "ROLE_ADMIN");

  // ---- Derivados do modo (staff nunca é asChild)
  const asChild = !isLibrarian && !isAdmin && !!user?.actingChild?.id;
  const currentChildId = asChild ? Number(user?.actingChild?.id) || null : null;

  const currentLibraryId = React.useMemo(() => {
    const direct = Number((user as any)?.libraryId);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const first = Number(user?.userLibraries?.[0]?.libraryId);
    return Number.isFinite(first) && first > 0 ? first : null;
  }, [user]);

  const selectedChildId = currentChildId;

  const setSelectedChildId = React.useCallback(
    async (id: string | number | null | undefined) => {
      // bloquear para não-família
      if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) return;

      if (
        id == null ||
        id === "" ||
        (typeof id === "string" &&
          ["family", "familia", "família", "__family__"].includes(id.toLowerCase()))
      ) {
        return clearChild();
      }

      if (typeof id === "string") {
        const match = id.match(/(\d+)/);
        const n = match ? Number(match[1]) : Number(id);
        if (!Number.isFinite(n) || n <= 0) return;
        return actAsChild(n);
      }

      if (typeof id === "number") {
        if (id > 0) return actAsChild(id);
        return clearChild();
      }
    },
    [user] // precisa do user atual para a verificação de role
  );

  // ---------- Primeiro login de família: força família e envia para /profiles ----------
  React.useEffect(() => {
    if (loading) return;

    const nowId = user?.id ?? null;
    const prevId = prevUserIdRef.current;
    const justLoggedIn = prevId == null && nowId != null;

    if (justLoggedIn) prevUserIdRef.current = nowId;

    const _isFamily = hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA");
    if (justLoggedIn && _isFamily && !forcedFirstFamilyRef.current) {
      forcedFirstFamilyRef.current = true;

      setPersistedMode("family");
      setPersistedChildId(null);

      setUser((prev) => (prev ? ({ ...prev, actingChild: null } as UserShape) : prev));
      (async () => {
        try {
          if (typeof (auth as any).clearActingChild === "function") {
            await (auth as any).clearActingChild();
          } else if (typeof (auth as any).clearChild === "function") {
            await (auth as any).clearChild();
          }
        } catch {}
        await refresh();
      })();

      if (!location.pathname.startsWith("/profiles")) {
        navigate("/profiles", { replace: true });
      }
      return;
    }

    if (prevUserIdRef.current !== nowId) {
      prevUserIdRef.current = nowId;
    }
  }, [loading, user, navigate, location.pathname, refresh]);

  const value: Ctx = {
    user,
    loading,
    isFamily,
    isLibrarian,
    isAdmin,
    currentLibraryId,
    asChild,
    currentChildId,
    selectedChildId,
    setSelectedChildId,
    refresh,
    actAsChild,
    clearChild,
    logout,
  };

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export const useUserSession = () => {
  const ctx = React.useContext(UserSessionContext);
  if (!ctx) throw new Error("useUserSession must be used within UserSessionProvider");
  return ctx;
};