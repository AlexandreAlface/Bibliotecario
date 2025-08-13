// apps/mobile/app/_layout.tsx
import { Slot } from "expo-router";
import * as React from "react";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { ThemeProvider } from "@bibliotecario/ui-mobile"; // vem da tua lib

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  if (!loaded) return null; // ou SplashScreen

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
