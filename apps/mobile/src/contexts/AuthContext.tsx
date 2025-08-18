// src/contexts/AuthContext.tsx
import * as React from "react";
import { authApi, MeResponse, RoleName } from "services/auth";

type User = MeResponse;

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  registerFamily: (payload: any) => Promise<void>;
};

const AuthContext = React.createContext<Ctx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
  registerFamily: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      const me = await authApi.me();
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

  // fallback DEV: se a API falhar, inventamos role com base no email
  async function devMock(email: string) {
    const role: RoleName = email.toLowerCase().includes("bibl")
      ? "BIBLIOTECÁRIO"
      : email.toLowerCase().includes("cri")
      ? "CRIANÇA"
      : "FAMÍLIA";
    setUser({ id: 1, fullName: "Utilizador Demo", email, roles: [role] });
  }

  const login = React.useCallback(
    async (email: string, password: string) => {
      try {
        await authApi.login(email, password);
        await refresh();
      } catch {
        await devMock(email);
      }
    },
    [refresh]
  );

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    setUser(null);
  }, []);

  const registerFamily = React.useCallback(
    async (payload: any) => {
      await authApi.registerFamily(payload);
      await refresh();
    },
    [refresh]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refresh, registerFamily }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
