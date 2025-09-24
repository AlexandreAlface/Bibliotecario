// apps/mobile/app/_layout.tsx
import * as React from "react";
import { Slot, usePathname, Redirect } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "src/contexts/AuthContext";

/** Helpers */
function extractRoles(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles.map((ur: any) => ur?.role?.name).filter(Boolean);
  }
  return [];
}
function isLibrarian(u: any): boolean {
  return extractRoles(u).some((r) => String(r).toUpperCase().includes("BIBL"));
}

/** Gate declarativo de navegação */
function AuthGate() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // Mantém a árvore estável enquanto carrega auth
  if (!ready) {
    return <Slot />;
  }

  // 1) Não autenticado → login
  if (!user) {
    if (pathname !== "/auth/login") {
      return <Redirect href="/auth/login" />;
    }
    return <Slot />;
  }

  // 2) Bibliotecário → força área do bibliotecário
  if (isLibrarian(user)) {
    const inLibrarian = pathname.startsWith("/librarian");
    if (!inLibrarian) {
      // depois do login ou se tentar ir a outra root, empurra para /librarian
      return <Redirect href="/librarian" />;
    }
    return <Slot />;
  }

  // 3) Família (comportamento existente)
  const hasKids = (user?.children?.length || 0) > 0;
  const acting = !!user?.actingChild;

  // a) Tem crianças e NÃO está a atuar como criança → perfis/family
  if (hasKids && !acting) {
    const inFamily = pathname.startsWith("/family");
    const inProfiles = pathname === "/profiles";
    if (!inFamily && !inProfiles) {
      return <Redirect href="/profiles" />;
    }
    return <Slot />;
  }

  // b) Já escolheu criança OU não tem crianças → manda para /family se estiver em raiz/perfis
  if (pathname === "/profiles" || pathname === "/") {
    return <Redirect href="/family" />;
  }

  return <Slot />;
}

/** ✅ DEFAULT EXPORT obrigatório para o Expo Router */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PaperProvider>
            <AuthGate />
          </PaperProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
