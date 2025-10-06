/**
 * Alexandre Brrissos 21131
 * Descrição: Guard de rota que exige certas roles. Redireciona para login se
 *            não houver sessão e para "/" se o utilizador não tiver permissão.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

type Props = { roles?: string[]; children?: React.ReactNode };

/** Normaliza role: uppercase, remove "ROLE_" e acentos. */
function normRole(r: string) {
  return String(r || "")
    .toUpperCase()
    .replace(/^ROLE_/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Exige autenticação e (opcionalmente) uma ou mais roles.
 * Admin/Librarian/Family são verificados pelos flags do contexto.
 */
export function RequireRole({ roles, children }: Props) {
  const { user, loading, isAdmin, isLibrarian, isFamily } = useUserSession();
  const location = useLocation();

  if (loading) return null;
  if (!user)
    return <Navigate to="/auth/login" replace state={{ from: location }} />;

  if (roles?.length) {
    const wanted = new Set(roles.map(normRole));
    const needAdmin =
      wanted.has("ADMIN") ||
      wanted.has("ADMINISTRATOR") ||
      wanted.has("ADMINISTRADOR");
    const needLib =
      wanted.has("LIBRARIAN") ||
      wanted.has("BIBLIOTECARIO") ||
      wanted.has("BIBLIOTECÁRIO");
    const needFam =
      wanted.has("FAMILY") || wanted.has("FAMILIA") || wanted.has("FAMÍLIA");

    const allowed =
      (needAdmin && isAdmin) ||
      (needLib && isLibrarian) ||
      (needFam && isFamily);
    if (!allowed) return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export default RequireRole;
