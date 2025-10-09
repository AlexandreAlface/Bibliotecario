/**
 * =============================================================================
 *  Módulo: apps/mobile/app/_layout.tsx
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Objetivo:
 *   - Layout raiz do Expo Router com *gates* de autenticação e *theming*.
 *   - Redireciona declarativamente consoante estado/role do utilizador.
 *
 *  Reforços aplicados:
 *   • Comentários completos (PT-PT) e JSDoc em helpers/componentes.
 *   • Helpers **PUROS** (sem efeitos laterais) e funções ≤ 30 linhas.
 *   • Tipos explícitos e defensivos (fallbacks no shape de `user`).
 * =============================================================================
 */

import * as React from "react";
import { Slot, usePathname, Redirect } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "src/contexts/AuthContext";
import AppThemeProvider from "src/providers/AppThemeProvider";
import { JSX } from "react";

/* =============================== Tipos =============================== */

type UserLike = {
  roles?: string[]; // pode vir como roles diretas
  userRoles?: Array<{ role?: { name?: string } | null }>; // ou aninhadas
  children?: Array<unknown>;
  actingChild?: unknown | null;
};

/* ============================ Helpers PUROS =========================== */

/**
 * Extrai nomes de *roles* de um objeto de utilizador em vários formatos.
 * - Não lança: devolve `[]` se não conseguir inferir nada.
 */
function extractRoles(u?: UserLike | null): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles
      .map((ur) => ur?.role?.name)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  }
  return [];
}

/**
 * Determina se o utilizador tem perfil de bibliotecário (case-insensitive).
 * Regras: contém “BIBL” (abrange “BIBLIOTECÁRIO/BIBLIOTECARIO/LIBRARIAN”).
 */
function isLibrarian(u?: UserLike | null): boolean {
  return extractRoles(u).some((r) => r.toUpperCase().includes("BIBL"));
}

/** Tem pelo menos uma criança associada? */
function hasChildren(u?: UserLike | null): boolean {
  return Array.isArray(u?.children) && u!.children!.length > 0;
}

/** Está a atuar em modo criança? */
function isActingChild(u?: UserLike | null): boolean {
  return !!u?.actingChild;
}

/* ========================== Auth Gate (Roteamento) ========================== */

/**
 * Componente de *gate* declarativo:
 * 1) Enquanto `ready=false` mantém a árvore com `<Slot />` (evita *flicker*).
 * 2) Sem sessão → força "/auth/login".
 * 3) Bibliotecário → força "/librarian".
 * 4) Família com perfis mas sem `actingChild` → força "/profiles".
 * 5) Família com `actingChild` ativo:
 *    - raiz "/" ou "/profiles" → redireciona para "/family".
 */
function AuthGate(): JSX.Element {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // 1) A aguardar hidratação de sessão
  if (!ready) return <Slot />;

  // 2) Não autenticado → /auth/login
  if (!user) {
    return pathname !== "/auth/login" ? (
      <Redirect href="/auth/login" />
    ) : (
      <Slot />
    );
  }

  // 3) Bibliotecário → /librarian (qualquer rota fora é redirecionada)
  if (isLibrarian(user)) {
    return pathname.startsWith("/librarian") ? (
      <Slot />
    ) : (
      <Redirect href="/librarian" />
    );
  }

  // 4) Família (tem crianças) mas ainda sem *acting child* → perfis
  if (hasChildren(user) && !isActingChild(user)) {
    const inFamily = pathname.startsWith("/family");
    const inProfiles = pathname === "/profiles";
    return inFamily || inProfiles ? <Slot /> : <Redirect href="/profiles" />;
  }

  // 5) Família com *acting child* ativo:
  //    - normaliza raiz e /profiles para /family
  if (pathname === "/profiles" || pathname === "/") {
    return <Redirect href="/family" />;
  }

  return <Slot />;
}

/* ========================= Providers combinados ========================= */

/**
 * Provider combinado de sessão (Auth) e tema (Paper + React Navigation).
 * Mantém a ordem correta de *providers* necessários à aplicação.
 */
function SessionAndTheme({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppThemeProvider>{children}</AppThemeProvider>
    </AuthProvider>
  );
}

/* ============================== Root Layout ============================== */

/**
 * Export default obrigatório para o Expo Router.
 * Envolve a árvore com *GestureHandler* e *SafeArea*.
 */
export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionAndTheme>
          <AuthGate />
        </SessionAndTheme>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/* ============================== Fim do ficheiro =============================
 *  Alexandre Brissos — Nº 21131
 * ========================================================================== */
