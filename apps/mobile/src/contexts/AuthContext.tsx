import * as React from 'react';
import { authApi } from 'src/services/auth';
import { childModeApi } from 'src/services/childMode';

export type Me = {
  id: number;
  fullName: string;
  email: string;
  roles?: string[];
  userRoles?: any[]; // compat
  children?: { id: number; name: string; avatarUrl?: string | null }[];
  actingChild?: { id: number; name: string } | null;
};

type Ctx = {
  user: Me | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  actAsChild: (childId: number) => Promise<void>;
  clearChild: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx>(null as any);
export const useAuth = () => React.useContext(AuthContext);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = React.useState<Me | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch { setUser(null); }
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    await refresh();
  }, [refresh]);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const actAsChild = React.useCallback(async (childId: number) => {
    await childModeApi.actAs(childId);
    await refresh();
  }, [refresh]);

  const clearChild = React.useCallback(async () => {
    await childModeApi.clear();
    await refresh();
  }, [refresh]);

  React.useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, refresh, login, logout, actAsChild, clearChild }}>
      {children}
    </AuthContext.Provider>
  );
}
