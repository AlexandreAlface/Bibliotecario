import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

type Props = { roles?: string[]; children?: React.ReactNode };

// normaliza string para facilitar comparação (uppercase, sem acentos e sem "ROLE_")
function normRole(r: string) {
  const up = String(r || "").toUpperCase().replace(/^ROLE_/, "");
  // remover acentos básicos para casar FAMILIA vs FAMÍLIA
  return up
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip diacritics
}

export function RequireRole({ roles, children }: Props) {
  const { user, loading, isAdmin, isLibrarian, isFamily } = useUserSession();
  const location = useLocation();

  // 1) Enquanto carrega, não redireciones
  if (loading) return null;

  // 2) Sem user depois de carregar -> login
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // 3) Com roles exigidas, usa os flags do contexto (robustos a sinónimos)
  if (roles && roles.length) {
    const wanted = new Set(roles.map(normRole));
    const needAdmin = wanted.has("ADMIN") || wanted.has("ADMINISTRATOR") || wanted.has("ADMINISTRADOR");
    const needLib  = wanted.has("LIBRARIAN") || wanted.has("BIBLIOTECARIO") || wanted.has("BIBLIOTECARIO") || wanted.has("BIBLIOTECÁRIO");
    const needFam  = wanted.has("FAMILY") || wanted.has("FAMILIA") || wanted.has("FAMILIA"); // (já sem acentos)

    const allowed =
      (needAdmin && isAdmin) ||
      (needLib && isLibrarian) ||
      (needFam && isFamily);

    if (!allowed) return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export default RequireRole;
