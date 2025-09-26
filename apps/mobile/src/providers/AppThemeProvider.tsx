// apps/mobile/src/providers/AppThemeProvider.tsx
import * as React from "react";
import { useColorScheme } from "react-native";
import { Provider as PaperProvider, adaptNavigationTheme } from "react-native-paper";
import {
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
  ThemeProvider, // 👈 expo-router recomenda isto em vez de NavigationContainer
} from "@react-navigation/native";

import { LightTheme, DarkTheme } from "src/theme";

// Adapta as cores do Paper aos temas do React Navigation
const { LightTheme: AdaptedNavLight, DarkTheme: AdaptedNavDark } = adaptNavigationTheme({
  reactNavigationLight: NavDefaultTheme,
  reactNavigationDark: NavDarkTheme,
  materialLight: LightTheme,
  materialDark: DarkTheme,
});

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const paperTheme = scheme === "dark" ? DarkTheme : LightTheme;
  const navTheme = scheme === "dark" ? AdaptedNavDark : AdaptedNavLight;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>{children}</ThemeProvider>
    </PaperProvider>
  );
}
