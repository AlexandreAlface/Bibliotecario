/**
 * Alexandre Brrissos 21131
 * Descrição: Guard de rota que obriga famílias a escolherem um perfil (criança)
 *            antes de navegar. Staff (Admin/Librarian) nunca é bloqueado.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

/**
 * Regras:
 * - Enquanto a sessão está a carregar → renderiza null (podes trocar por spinner).
 * - Admins/Librarians e utilizadores que NÃO sejam família → passam sempre.
 * - Famílias: se têm crianças, não estão em `asChild` e não ativaram "familyMode"
 *   (flag em sessionStorage) → redireciona para /profiles.
 */
export default function RequireFamilyProfile() {
  const { loading, isFamily, isAdmin, isLibrarian, asChild, user } = useUserSession();

  if (loading) return null; // evita redirecionar enquanto carrega

  // Staff e quem não é família nunca é forçado a escolher perfil
  if (isAdmin || isLibrarian || !isFamily) return <Outlet />;

  const hasKids = (user?.children?.length ?? 0) > 0;
  const choseFamilyMode =
    typeof window !== "undefined" &&
    window.sessionStorage?.getItem("familyMode") === "1";
  const mustPick = hasKids && !asChild && !choseFamilyMode;

  return mustPick ? <Navigate to="/profiles" replace /> : <Outlet />;
}
