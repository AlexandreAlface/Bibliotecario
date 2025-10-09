/**
 * ============================================================================
 *  Módulo: apps/mobile/app/index.tsx
 *  Autor:  Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Objetivo:
 *   - Ecrã raiz que redireciona consoante o estado de sessão/role.
 *
 *  Reforços aplicados:
 *   • Comentários/JSDoc em PT-PT.
 *   • Helpers **puros** (sem efeitos) para decidir a rota de destino.
 *   • Funções curtas (≤ 30 linhas) e coesas.
 *   • Tipagem explícita mínima do utilizador.
 * ============================================================================
 */

import * as React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "src/contexts/AuthContext";
import { JSX } from "react";

/** Forma mínima do utilizador que precisamos aqui. */
type UserShape = { roles?: string[] | any[] };

/** Extrai roles de forma defensiva. (PURO) */
function extractRoles(u?: UserShape | null): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  // fallback para estruturas { userRoles: [{ role: { name } }]} se existirem
  // @ts-ignore – ignorar se não existir
  if (Array.isArray(u.userRoles)) {
    // @ts-ignore
    return u.userRoles.map((ur: any) => ur?.role?.name).filter(Boolean);
  }
  return [];
}

/** Verifica se tem perfil de bibliotecário (case-insensitive). (PURO) */
function isLibrarian(u?: UserShape | null): boolean {
  return extractRoles(u).some((r) => String(r).toUpperCase().includes("BIBL"));
}

/** Decide rota de entrada consoante o role. (PURO) */
function pickHomeRoute(u?: UserShape | null): "/librarian" | "/family" {
  return isLibrarian(u) ? "/librarian" : "/family";
}

/**
 * Componente raiz:
 * - Bloqueia render enquanto a sessão está a ser carregada (`ready`).
 * - Redireciona para a área adequada: /librarian | /family | /auth/login.
 */
export default function Index(): JSX.Element | null {
  const { user, ready } = useAuth(); // `ready` vem do provider reforçado

  if (!ready) return null; // mantém a árvore estável até termos sessão

  const href = user ? pickHomeRoute(user as UserShape) : "/auth/login";
  return <Redirect href={href} />;
}

/* ============================== Fim do ficheiro =============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
