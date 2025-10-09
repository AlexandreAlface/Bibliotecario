/**
 * Alexandre Brrissos 21131
 * Descrição: Contexto de sessão do utilizador (roles, acting child, biblioteca atual),
 *            com persistência em storage e integração com serviços de auth.
 */

import * as React from "react";
import * as auth from "@/services/auth";
import { normalizeRoleNames } from "@/services/auth";
import { useNavigate, useLocation } from "react-router-dom";

/* ---------- Tipos ---------- */
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

/* ---------- Storage (seguro) ---------- */
const KEY_MODE = "familyMode"; // "child" | "family" (compat: "1" = "family")
const KEY_CHILD_ID = "actingChildId";
type FamilyMode = "child" | "family" | null;

function safeGetSS(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSetSS(k: string, v: string | null) {
  try {
    v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v);
  } catch {}
}
function safeGetLS(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSetLS(k: string, v: string | null) {
  try {
    v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  } catch {}
}

function getPersistedMode(): FamilyMode {
  const raw = safeGetSS(KEY_MODE) ?? safeGetLS(KEY_MODE);
  // compat com versões antigas que guardavam "1"
  const v = raw === "1" ? "family" : raw;
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

/* ---------- Roles helpers ---------- */
function hasRole(user: UserShape | null, ...roles: string[]) {
  if (!user) return false;
  const current = new Set(
    (user.roles?.length ? user.roles : normalizeRoleNames(user)).map((r) =>
      String(r).toUpperCase()
    )
  );
  return roles.some((r) => {
    const R = String(r).toUpperCase();
    if (R === "ADMIN")
      return (
        current.has("ADMIN") ||
        current.has("ADMINISTRATOR") ||
        current.has("ADMINISTRADOR") ||
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

/* ---------- /auth/me ---------- */
async function fetchCurrentUser(): Promise<UserShape | null> {
  // preferir serviço central; fallback para fetch direto
  try {
    const raw = await (auth as any).meSvc?.();
    if (!raw) return null;
    return { ...(raw as any), roles: normalizeRoleNames(raw) } as UserShape;
  } catch {
    const base =
      (import.meta as any).env?.VITE_API_URL ||
      (window as any).__API_BASE__ ||
      "/api";
    const res = await fetch(`${String(base).replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    return { ...(raw as any), roles: normalizeRoleNames(raw) } as UserShape;
  }
}

/* ---------- Contexto ---------- */
const UserSessionContext = React.createContext<Ctx | null>(null);

/** Devolve um filho pelo id (se existir). */
function findChild(
  me: UserShape | null,
  id: number | null | undefined
): ChildLite | null {
  if (!me?.children || !Number.isFinite(Number(id))) return null;
  const c = me.children.find((x) => Number(x.id) === Number(id));
  return c
    ? { id: c.id, name: c.name ?? null, avatarUrl: c.avatarUrl ?? null }
    : null;
}

/** Aplica políticas de acting child para staff/família e persistência. */
function deriveNextUser(me: UserShape | null): UserShape | null {
  if (!me) return null;

  const isFam = hasRole(me, "FAMILY", "FAMÍLIA", "FAMILIA");
  const isStaff =
    hasRole(me, "LIBRARIAN", "BIBLIOTECARIO", "BIBLIOTECÁRIO") ||
    hasRole(me, "ADMIN", "ADMINISTRATOR", "ADMINISTRADOR", "ROLE_ADMIN");

  if (isStaff) {
    setPersistedMode("family");
    setPersistedChildId(null);
    return { ...me, actingChild: null };
  }

  if (!isFam) {
    setPersistedMode("family");
    setPersistedChildId(null);
    return { ...me, actingChild: null };
  }

  const persistedMode = getPersistedMode();
  const persistedId = getPersistedChildId();

  // família segue persistência ou contexto do servidor
  if (persistedMode === "family") return { ...me, actingChild: null };

  if (persistedMode === "child") {
    const child =
      (persistedId && findChild(me, persistedId)) ||
      (me.actingChild ? findChild(me, Number(me.actingChild.id)) : null);
    if (child) {
      setPersistedChildId(child.id);
      return { ...me, actingChild: child };
    }
    setPersistedChildId(null);
    return { ...me, actingChild: null };
  }

  // sem persistência: adota o que vier do servidor
  const serverId = Number(me.actingChild?.id);
  if (Number.isFinite(serverId) && serverId > 0) {
    setPersistedMode("child");
    setPersistedChildId(serverId);
  } else {
    setPersistedMode("family");
    setPersistedChildId(null);
  }
  return me;
}

/* ---------- Provider ---------- */
export function UserSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = React.useState<UserShape | null>(null);
  const [loading, setLoading] = React.useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const mounted = React.useRef(true);
  const prevUserIdRef = React.useRef<number | null>(null);
  const forcedFirstFamilyRef = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    (async () => {
      await refresh();
    })();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Atualiza o utilizador (aplica políticas/persistência). */
  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchCurrentUser();
      const next = deriveNextUser(me);
      if (mounted.current) setUser(next);
    } catch {
      if (mounted.current) {
        setUser(null);
        setPersistedMode(null);
        setPersistedChildId(null);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  /** Passa a atuar como uma criança (família apenas). */
  const actAsChild = React.useCallback(
    async (childId: number) => {
      if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) return refresh();

      setPersistedMode("child");
      setPersistedChildId(childId);

      // otimista: atualiza localmente já
      setUser((prev) => {
        if (!prev) return prev;
        const child = prev.children?.find(
          (c) => Number(c.id) === Number(childId)
        );
        return {
          ...prev,
          actingChild: child
            ? {
                id: child.id,
                name: child.name ?? null,
                avatarUrl: child.avatarUrl ?? null,
              }
            : { id: childId },
        } as UserShape;
      });

      try {
        await (auth as any).actAsChild?.(childId);
      } catch {}
      await refresh();
    },
    [user, refresh]
  );

  /** Sai do modo criança (família apenas). */
  const clearChild = React.useCallback(async () => {
    if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) return refresh();

    setPersistedMode("family");
    setPersistedChildId(null);
    setUser((prev) =>
      prev ? ({ ...prev, actingChild: null } as UserShape) : prev
    );

    try {
      if (typeof (auth as any).clearActingChild === "function")
        await (auth as any).clearActingChild();
      else if (typeof (auth as any).clearChild === "function")
        await (auth as any).clearChild();
    } catch {}
    await refresh();
  }, [user, refresh]);

  /** Logout total. */
  const logout = React.useCallback(async () => {
    try {
      await (auth as any).logout?.();
    } finally {
      setPersistedMode(null);
      setPersistedChildId(null);
      if (mounted.current) setUser(null);
    }
  }, []);

  /** Setter para o selector (string | number | 'family' | null). */
  const setSelectedChildId = React.useCallback(
    async (id: string | number | null | undefined) => {
      if (!hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA")) return;
      const toFamily =
        id == null ||
        id === "" ||
        (typeof id === "string" &&
          ["family", "familia", "família", "__family__"].includes(
            id.toLowerCase()
          ));
      if (toFamily) return clearChild();

      if (typeof id === "string") {
        const match = id.match(/(\d+)/);
        const n = match ? Number(match[1]) : Number(id);
        if (!Number.isFinite(n) || n <= 0) return;
        return actAsChild(n);
      }
      if (typeof id === "number") return id > 0 ? actAsChild(id) : clearChild();
    },
    [user, actAsChild, clearChild]
  );

  /* ---------- Primeiro login de família: força modo família + /profiles ---------- */
  React.useEffect(() => {
    if (loading) return;

    const nowId = user?.id ?? null;
    const prevId = prevUserIdRef.current;
    const justLoggedIn = prevId == null && nowId != null;
    if (prevId !== nowId) prevUserIdRef.current = nowId;

    if (!justLoggedIn) return;

    const _isFamily = hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA");
    if (_isFamily && !forcedFirstFamilyRef.current) {
      forcedFirstFamilyRef.current = true;

      setPersistedMode("family");
      setPersistedChildId(null);
      setUser((prev) =>
        prev ? ({ ...prev, actingChild: null } as UserShape) : prev
      );

      (async () => {
        try {
          if (typeof (auth as any).clearActingChild === "function")
            await (auth as any).clearActingChild();
          else if (typeof (auth as any).clearChild === "function")
            await (auth as any).clearChild();
        } catch {}
        await refresh();
      })();

      if (!location.pathname.startsWith("/profiles")) {
        navigate("/profiles", { replace: true });
      }
    }
  }, [loading, user, navigate, location.pathname, refresh]);

  /* ---------- Derivados ---------- */
  const isFamily = hasRole(user, "FAMILY", "FAMÍLIA", "FAMILIA");
  const isLibrarian = hasRole(
    user,
    "LIBRARIAN",
    "BIBLIOTECÁRIO",
    "BIBLIOTECARIO"
  );
  const isAdmin = hasRole(
    user,
    "ADMIN",
    "ADMINISTRATOR",
    "ADMINISTRADOR",
    "ROLE_ADMIN"
  );
  const asChild = !isLibrarian && !isAdmin && !!user?.actingChild?.id;
  const currentChildId = asChild ? Number(user?.actingChild?.id) || null : null;

  const currentLibraryId = React.useMemo(() => {
    const direct = Number((user as any)?.libraryId);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const first = Number(user?.userLibraries?.[0]?.libraryId);
    return Number.isFinite(first) && first > 0 ? first : null;
  }, [user]);

  const value = React.useMemo<Ctx>(
    () => ({
      user,
      loading,
      isFamily,
      isLibrarian,
      isAdmin,
      currentLibraryId,
      asChild,
      currentChildId,
      selectedChildId: currentChildId,
      setSelectedChildId,
      refresh,
      actAsChild,
      clearChild,
      logout,
    }),
    [
      user,
      loading,
      isFamily,
      isLibrarian,
      isAdmin,
      currentLibraryId,
      asChild,
      currentChildId,
      setSelectedChildId,
      refresh,
      actAsChild,
      clearChild,
      logout,
    ]
  );

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

/** Hook de consumo do contexto de sessão. */
export const useUserSession = () => {
  const ctx = React.useContext(UserSessionContext);
  if (!ctx)
    throw new Error("useUserSession must be used within UserSessionProvider");
  return ctx;
};
