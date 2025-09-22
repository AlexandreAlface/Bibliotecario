// apps/web/src/routes/RequireAuth.tsx
import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

type Props = {
  children?: React.ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { user, loading } = useUserSession();
  const loc = useLocation();

  if (loading) return null; // podes trocar por um spinner global

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: loc }} />;
  }

  // Se for usado como wrapper, renderiza os children.
  // Se for usado sozinho numa rota pai, cai no <Outlet />.
  return <>{children ?? <Outlet />}</>;
}
