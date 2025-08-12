// packages/ui-mobile/src/theme/theme.ts
import { MD3LightTheme, MD3DarkTheme, configureFonts } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { colors as tColors, radius as tRadius } from "@bibliotecario/tokens";

// CORES (as do teu MUI)
const colors = {
  primary: tColors?.primary ?? "#05a79e",
  secondary: tColors?.secondary ?? "#f06941",
  background: tColors?.background ?? "#fafafa",
  surface: tColors?.surface ?? "#ffffff",
  text: tColors?.text ?? "#111111",
};

// Poppins
const fonts = configureFonts({
  config: {
    displayLarge:  { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
    displayMedium: { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
    displaySmall:  { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
    headlineLarge: { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    headlineMedium:{ fontFamily: "Poppins-Medium",   fontWeight: "500" },
    headlineSmall: { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    titleLarge:    { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    titleMedium:   { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    titleSmall:    { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    labelLarge:    { fontFamily: "Poppins-Medium",   fontWeight: "500" }, // botões
    labelMedium:   { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    labelSmall:    { fontFamily: "Poppins-Medium",   fontWeight: "500" },
    bodyLarge:     { fontFamily: "Poppins-Regular",  fontWeight: "400" },
    bodyMedium:    { fontFamily: "Poppins-Regular",  fontWeight: "400" },
    bodySmall:     { fontFamily: "Poppins-Regular",  fontWeight: "400" }
  } as any
});

const roundness = (tRadius as any)?.md ?? 16;

function base(theme: MD3Theme): MD3Theme {
  return {
    ...theme,
    roundness,
    colors: {
      ...theme.colors,
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      surface: colors.surface,
      onSurface: colors.text
    },
    fonts
  };
}

export const lightTheme: MD3Theme = base(MD3LightTheme);
export const darkTheme: MD3Theme  = base(MD3DarkTheme);
