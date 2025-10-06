/**
 * =============================================================================
 *  Módulo: apps/mobile/src/contexts/AuthContext.tsx
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers/funções **PUROS** e curtas (≤ 30 linhas).
 *   • Tipagem explícita do contexto e do “user shape”.
 *   • Flag `ready` para gating de UI enquanto carrega sessão.
 * =============================================================================
 */

import * as React from "react";
import { authApi } from "src/services/auth";

/** Perfil resumido de criança apresentado no contexto. */
type ChildLite = { id: number; name: string; avatarUrl?: string | null };

/** Forma normalizada do utilizador devolvida por `/auth/me`. */
type UserShape = {
  id: number;
  fullName: string;
  email: string;
  roles: string[]; // ex.: ["FAMILY"], ["LIBRARIAN"], ["ADMIN"]
  children?: ChildLite[];
  /** Se ativo, indica “modo criança”. */
  actingChild?: { id: number; name?: string } | null;
};

/** Interface do contexto de autenticação exposta à app. */
type Ctx = {
  user: UserShape | null;
  /** `true` quando já tentámos carregar `/auth/me` (com sucesso ou erro). */
  ready: boolean;
  /** Inicia sessão e carrega o utilizador/roles/children. */
  login: (email: string, password: string) => Promise<void>;
  /** Termina sessão atual. */
  logout: () => Promise<void>;
  /** Recarrega o utilizador a partir do backend. */
  refresh: () => Promise<void>;
  /** Ativa “modo criança” (impersonação). */
  actAsChild: (childId: number) => Promise<void>;
  /** Limpa “modo criança”. */
  clearChild: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | null>(null);

/**
 * Provider de autenticação.
 * - Na montagem, tenta carregar `/auth/me` para saber se há sessão válida.
 * - Expõe helpers para login/logout e alternar “modo criança”.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserShape | null>(null);
  const [ready, setReady] = React.useState(false);

  /**
   * Recarrega a sessão atual a partir do backend.
   * Mantém `ready` em true após a primeira tentativa (sucesso/erro).
   */
  const refresh = React.useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      // Se 401/403 ou falha de rede: assume não autenticado
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  // Primeira carga de sessão
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Faz login e atualiza o contexto com a conta autenticada. */
  async function login(email: string, password: string) {
    await authApi.login(email, password);
    await refresh(); // carrega user/roles/children
  }

  /** Faz logout e limpa o contexto. O layout deve tratar da navegação. */
  async function logout() {
    await authApi.logout();
    setUser(null);
    // Não navegamos aqui: o layout/roteamento trata do redirect.
  }

  /** Ativa o “modo criança” e volta a obter `/auth/me`. */
  async function actAsChild(childId: number) {
    await authApi.actAsChild(childId);
    await refresh();
  }

  /** Limpa o “modo criança” e volta a obter `/auth/me`. */
  async function clearChild() {
    await authApi.clearActingChild();
    await refresh();
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, login, logout, refresh, actAsChild, clearChild }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook de acesso ao contexto de autenticação.
 * Garante utilização apenas dentro do `AuthProvider`.
 */
export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
