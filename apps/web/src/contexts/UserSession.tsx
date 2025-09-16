// apps\web\src\contexts\UserSession.tsx
import React from "react";
import * as auth from "@/services/auth"; // importa tudo (login, logout, actAsChild, ...)

// ---- Tipos ----
type ChildLite = {
  id: number;
  name?: string | null;
  avatarUrl?: string | null;
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
};

type Ctx = {
  user: UserShape | null;
  loading: boolean;

  // Flags de papel
  isFamily: boolean;
  isLibrarian: boolean;
  isAdmin: boolean;

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
  if (!user?.roles) return false;
  const set = new Set(user.roles.map((r) => r.toUpperCase()));
  return roles.some((r) => set.has(r.toUpperCase()));
}

const UserSessionContext = React.createContext<Ctx | null>(null);

// ---- Helper robusto para carregar /auth/me, mesmo que o serviço não exporte "me" ----
async function fetchCurrentUser(): Promise<UserShape | null> {
  // tenta funções que possam existir no teu services/auth
  const anyAuth = auth as any;
  if (typeof anyAuth.me === "function") return anyAuth.me();
  if (typeof anyAuth.getMe === "function") return anyAuth.getMe();
  if (typeof anyAuth.profile === "function") return anyAuth.profile();
  if (typeof anyAuth.current === "function") return anyAuth.current();

  // fallback via fetch direto
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
    // 401/403 -> sem sessão
    if (res.status === 401 || res.status === 403) return null;
    throw new Error(`/auth/me falhou: ${res.status}`);
  }

  const data = await res.json();
  return data as UserShape;
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
    // tenta ambos os nomes comuns
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
  const isAdmin = hasRole(user, "ADMIN");

  const asChild = isFamily && !!user?.actingChild?.id;
  const currentChildId = asChild ? user!.actingChild!.id! : null;

  // Shims: mantêm as tuas páginas atuais a compilar e a funcionar
  const selectedChildId = currentChildId;
  const setSelectedChildId = React.useCallback(
    async (id: string | number | null | undefined) => {
      if (!isFamily) return; // bibliotecário/admin não tem perfis de criança
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
