/**
 * Alexandre Brrissos 21131
 * Descrição: Guard de rota que exige sessão autenticada. Se não houver user,
 *            redireciona para /auth/login preservando a origem em state.from.
 */

import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserSession } from "@/contexts/UserSession";

type Props = {
  /** Conteúdo a renderizar quando autenticado; se omitido, usa <Outlet/>. */
  children?: React.ReactNode;
};

/**
 * Exige autenticação para aceder à rota.
 * - Enquanto a sessão está a carregar, não renderiza nada (podes trocar por spinner).
 * - Sem user → redireciona para /auth/login com `state.from` para voltar depois.
 */
export function RequireAuth({ children }: Props) {
  const { user, loading } = useUserSession();
  const loc = useLocation();

  if (loading) return null; // TODO: substituir por <GlobalSpinner/> se existir

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: loc }} />;
  }

  // Wrapper: mostra children; Rota-pai: delega para <Outlet/>.
  return <>{children ?? <Outlet />}</>;
}
