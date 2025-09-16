// apps/web/src/routes/RequireRole.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";
import type { PropsWithChildren } from "react";

export function RequireRole({ roles, children }: PropsWithChildren<{ roles: string[] }>) {
  const { user, loading } = useUserSession();
  const loc = useLocation();
  if (loading) return null;
  const ok = user?.roles?.some(r => roles.map(s => s.toUpperCase()).includes(r.toUpperCase()));
  return ok ? <>{children}</> : <Navigate to="/auth/login" state={{ from: loc }} replace />;
}
