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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<WebUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const u = await meSvc();
    setUser(u);
    setLoading(false);
    return u;
  }, []);

  React.useEffect(() => {
    // tenta recuperar sessão ao entrar
    refresh();
  }, [refresh]);

  const login = React.useCallback(async (email: string, password: string) => {
    await loginSvc(email, password);
    return await refresh();
  }, [refresh]);

  const logout = React.useCallback(async () => {
    await logoutSvc();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
