/**
 * =============================================================================
 *  Módulo: apps/mobile/src/providers/AppThemeProvider.tsx
 *  Autor:  Alexandre Brissos — Nº 21131
 * -----------------------------------------------------------------------------
 *  Reforços aplicados:
 *   • Comentários/JSDoc completos (PT-PT).
 *   • Helpers **PUROS** (sem efeitos) para escolher esquema de cor.
 *   • Funções curtas (≤ 30 linhas), coesas e facilmente testáveis.
 *   • Tipagem explícita e memoização para evitar recalcular temas.
 * =============================================================================
 */

import * as React from "react";
import { useColorScheme, type ColorSchemeName } from "react-native";
import {
  Provider as PaperProvider,
  adaptNavigationTheme,
} from "react-native-paper";
import {
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
  ThemeProvider, // expo-router recomenda ThemeProvider em vez de NavigationContainer
} from "@react-navigation/native";

import { LightTheme, DarkTheme } from "src/theme";

/* =============================== Helpers PUROS =============================== */

/**
 * Decide o esquema de cor final a partir do valor do SO.
 * Mantém sempre um fallback previsível: 'light' quando `null`.
 */
function pickScheme(s: ColorSchemeName): "light" | "dark" {
  return s === "dark" ? "dark" : "light";
}

/* ============================ Integração de temas ============================
   O `adaptNavigationTheme` alinha os tokens do React Navigation com o
   React Native Paper + Material Design (os nossos `LightTheme`/`DarkTheme`). */
const { LightTheme: AdaptedNavLight, DarkTheme: AdaptedNavDark } =
  adaptNavigationTheme({
    reactNavigationLight: NavDefaultTheme,
    reactNavigationDark: NavDarkTheme,
    materialLight: LightTheme,
    materialDark: DarkTheme,
  });

/* ================================= Componente =============================== */

/**
 * Provider único de tema para a app (Paper + React Navigation).
 * - Lê o esquema do SO (claro/escuro).
 * - Aplica o tema Material (Paper) e a variante adaptada do Navigation.
 */
export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const scheme = pickScheme(systemScheme);

  // Memoizar para não recriar objetos de tema em cada render.
  const paperTheme = React.useMemo(
    () => (scheme === "dark" ? DarkTheme : LightTheme),
    [scheme]
  );
  const navTheme = React.useMemo(
    () => (scheme === "dark" ? AdaptedNavDark : AdaptedNavLight),
    [scheme]
  );

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>{children}</ThemeProvider>
    </PaperProvider>
  );
}

/* ============================== Fim do módulo ===============================
 *  Alexandre Brissos — Nº 21131
 * ============================================================================ */
