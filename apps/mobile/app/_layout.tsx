import * as React from "react";
import { Slot, usePathname, Redirect } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "src/contexts/AuthContext";

/** Gate declarativo de navegação */
function AuthGate() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // Enquanto a auth não está pronta, mostra um layout vazio estável
  if (!ready) {
    return <Slot />; // mantém a estrutura do router sem “early returns” problemáticos
  }

  // 1) Não autenticado → manter login
  if (!user) {
    if (pathname !== "/auth/login") {
      return <Redirect href="/auth/login" />;
    }
    return <Slot />;
  }

  // 2) Autenticado
  const hasKids = (user?.children?.length || 0) > 0;
  const acting = !!user?.actingChild;

  // a) Tem crianças e NÃO está a atuar como criança → perfis
  if (hasKids && !acting) {
    const inFamily = pathname.startsWith("/family");
    const inProfiles = pathname === "/profiles";
    if (!inFamily && !inProfiles) {
      return <Redirect href="/profiles" />;
    }
    return <Slot />;
  }

  // b) Já escolheu criança OU não tem crianças
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
