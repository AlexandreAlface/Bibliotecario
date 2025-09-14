import { Stack, useRouter, useSegments } from "expo-router";
import * as React from "react";
import "react-native-reanimated";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { ThemeProvider } from "@bibliotecario/ui-mobile";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "src/contexts/AuthContext";

function AuthGate() {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (!ready) return; // espera carregar o me()
    const inAuth = segments[0] === "auth";

    if (!user && !inAuth) router.replace("/auth/login"); // não autenticado → login
    if (user && inAuth) router.replace("/");              // autenticado → app (tabs)
  }, [ready, user, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,      // swipe back iOS
        animation: "default",
        presentation: "card",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  if (!loaded) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
