// apps/web/src/contexts/UserSession.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type WebUser,
  getMe,
  actAsChild as apiActAsChild,
  clearActingChild as apiClearActingChild,
} from "../services/auth";

type Ctx = {
  user: WebUser | null;
  loading: boolean;
  asChild: boolean;
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
  actAsChild: (id: number | string) => Promise<void>;
  exitChild: () => Promise<void>;
  refresh: () => Promise<void>;
};

const UserSessionContext = createContext<Ctx | null>(null);

export function UserSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<WebUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const me = await getMe();
      setUser(me);
      const active = me.actingChild ?? null;
      const first = active?.id ? active : me.children?.[0];
      setSelectedChildId(first ? String(first.id) : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const asChild = !!user?.actingChild;

  const actAsChild = async (id: number | string) => {
    const updated = await apiActAsChild(Number(id));
    setUser(updated);
    setSelectedChildId(String(id));
  };

  const exitChild = async () => {
    const updated = await apiClearActingChild();
    setUser(updated);
    const first = updated.children?.[0];
    setSelectedChildId(first ? String(first.id) : "");
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      asChild,
      selectedChildId,
      setSelectedChildId,
      actAsChild,
      exitChild,
      refresh,
    }),
    [user, loading, asChild, selectedChildId]
  );

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext);
  if (!ctx)
    throw new Error("useUserSession must be used within UserSessionProvider");
  return ctx;
}
