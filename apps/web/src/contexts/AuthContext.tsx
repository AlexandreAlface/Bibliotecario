/**
 * Alexandre Brrissos 21131
 * Descrição: Contexto de autenticação (user, login/logout, refresh).
 * - Evita setState após unmount
 * - Memoiza o value do provider para evitar re-renderes desnecessários
 */

import * as React from "react";
import { meSvc, loginSvc, logoutSvc, type WebUser } from "@/services/auth";

type Ctx = {
  user: WebUser | null;
  loading: boolean;
  refresh: () => Promise<WebUser | null>;
  login: (email: string, password: string) => Promise<WebUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | null>(null);

/**
 * Provider de autenticação.
 * - Carrega a sessão à montagem.
 * - `refresh()` atualiza e devolve o utilizador.
 * - `login()` faz login e depois `refresh()`.
 * - `logout()` termina sessão e limpa estado local.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<WebUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const mounted = React.useRef(true);

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

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const u = await meSvc();
      if (mounted.current) setUser(u);
      return u ?? null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      await loginSvc(email, password);
      return refresh();
    },
    [refresh]
  );

  const logout = React.useCallback(async () => {
    try {
      await logoutSvc();
    } finally {
      if (mounted.current) setUser(null);
    }
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({ user, loading, refresh, login, logout }),
    [user, loading, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para consumir o contexto de auth. */
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
