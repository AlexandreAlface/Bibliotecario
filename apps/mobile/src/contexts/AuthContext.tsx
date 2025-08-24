// src/contexts/AuthContext.tsx
import React from 'react';
import { authApi } from 'src/services/auth';

type ChildLite = { id: number; name: string; avatarUrl?: string | null };
type UserShape = {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  children?: ChildLite[];
  actingChild?: { id: number; name?: string } | null;
};

type Ctx = {
  user: UserShape | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  actAsChild: (childId: number) => Promise<void>;
  clearChild: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserShape | null>(null);
  const [ready, setReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function login(email: string, password: string) {
    await authApi.login(email, password);
    await refresh(); // ← carrega roles + children + actingChild
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  async function actAsChild(childId: number) {
    await authApi.actAsChild(childId);
    await refresh();
  }

  async function clearChild() {
    await authApi.clearActingChild();
    await refresh();
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refresh, actAsChild, clearChild }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
