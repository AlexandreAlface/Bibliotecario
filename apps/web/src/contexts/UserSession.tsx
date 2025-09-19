// apps/web/src/contexts/UserSession.tsx
import React from "react";
import * as auth from "@/services/auth";
import { normalizeRoleNames } from "@/services/auth";

// ---- Tipos ----
type ChildLite = {
  id: number;
  name?: string | null;
  avatarUrl?: string | null;
};

// 👇 novo: mapeamento das bibliotecas do utilizador
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

  // 👇 novos campos (muitos backends já devolvem algo assim)
  userLibraries?: UserLibraryLite[];
  libraryId?: number; // fallback direto, se existir
};

type Ctx = {
  user: UserShape | null;
  loading: boolean;

  // Flags de papel
  isFamily: boolean;
  isLibrarian: boolean;
  isAdmin: boolean;

  // Biblioteca corrente (para admin e, se quiseres, para bibliotecário)
  currentLibraryId: number | null;

  // Perfil atual (apenas famílias)
  asChild: boolean;
  currentChildId: number | null;

  selectedChildId: number | null;
  setSelectedChildId: (id: string | number | null | undefined) => Promise<void>;

  refresh: () => Promise<void>;
  actAsChild: (childId: number) => Promise<void>;
  clearChild: () => Promise<void>;
  logout: () => Promise<void>;
};

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
    // sinónimos rápidos
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

// ---- Helper robusto para carregar /auth/me ----
async function fetchCurrentUser(): Promise<UserShape | null> {
  // … (mantém o teu “detector” de função me/getMe/etc.)
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
  // 👇 Normaliza/garante roles:string[] para o resto da app
  const roles = normalizeRoleNames(raw);
  const data = { ...(raw as any), roles } as UserShape;
  return data;
}

export function UserSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = React.useState<UserShape | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchCurrentUser();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function actAsChild(childId: number) {
    await (auth as any).actAsChild?.(childId);
    await refresh();
  }

  async function clearChild() {
    if (typeof (auth as any).clearActingChild === "function") {
      await (auth as any).clearActingChild();
    } else if (typeof (auth as any).clearChild === "function") {
      await (auth as any).clearChild();
    }
    await refresh();
  }

  async function logout() {
    try {
      await (auth as any).logout?.();
    } finally {
      setUser(null);
    }
  }

  const isFamily = hasRole(user, "FAMILY", "FAMÍLIA");
  const isLibrarian = hasRole(
    user,
    "LIBRARIAN",
    "BIBLIOTECÁRIO",
    "BIBLIOTECARIO"
  );
  // 👇 aceita sinónimos comuns para admin
  const isAdmin = hasRole(user, "ADMIN", "ADMINISTRATOR", "ADMINISTRADOR");

  const asChild = isFamily && !!user?.actingChild?.id;
  const currentChildId = asChild ? user!.actingChild!.id! : null;

  // 👇 biblioteca corrente (admin)
  const currentLibraryId = React.useMemo(() => {
    const direct = Number((user as any)?.libraryId);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const first = Number(user?.userLibraries?.[0]?.libraryId);
    return Number.isFinite(first) && first > 0 ? first : null;
  }, [user]);

  // Shims: mantém páginas atuais
  const selectedChildId = currentChildId;
  const setSelectedChildId = React.useCallback(
    async (id: string | number | null | undefined) => {
      if (!isFamily) return;
      if (id == null || id === "") return clearChild();
      const n = typeof id === "string" ? Number(id) : id;
      return actAsChild(n);
    },
    [isFamily]
  );

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

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export const useUserSession = () => {
  const ctx = React.useContext(UserSessionContext);
  if (!ctx)
    throw new Error("useUserSession must be used within UserSessionProvider");
  return ctx;
};
