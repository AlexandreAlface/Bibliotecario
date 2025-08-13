var _a, _b, _c, _d, _e, _f;
// packages/ui-mobile/src/theme/theme.ts
import { MD3LightTheme, MD3DarkTheme, configureFonts } from "react-native-paper";
import { colors as tColors, radius as tRadius } from "@bibliotecario/tokens";
// CORES (as do teu MUI)
const colors = {
    primary: (_a = tColors === null || tColors === void 0 ? void 0 : tColors.primary) !== null && _a !== void 0 ? _a : "#05a79e",
    secondary: (_b = tColors === null || tColors === void 0 ? void 0 : tColors.secondary) !== null && _b !== void 0 ? _b : "#f06941",
    background: (_c = tColors === null || tColors === void 0 ? void 0 : tColors.background) !== null && _c !== void 0 ? _c : "#fafafa",
    surface: (_d = tColors === null || tColors === void 0 ? void 0 : tColors.surface) !== null && _d !== void 0 ? _d : "#ffffff",
    text: (_e = tColors === null || tColors === void 0 ? void 0 : tColors.text) !== null && _e !== void 0 ? _e : "#111111",
};
// Poppins
const fonts = configureFonts({
    config: {
        displayLarge: { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
        displayMedium: { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
        displaySmall: { fontFamily: "Poppins-SemiBold", fontWeight: "600" },
        headlineLarge: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        headlineMedium: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        headlineSmall: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        titleLarge: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        titleMedium: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        titleSmall: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        labelLarge: { fontFamily: "Poppins-Medium", fontWeight: "500" }, // botões
        labelMedium: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        labelSmall: { fontFamily: "Poppins-Medium", fontWeight: "500" },
        bodyLarge: { fontFamily: "Poppins-Regular", fontWeight: "400" },
        bodyMedium: { fontFamily: "Poppins-Regular", fontWeight: "400" },
        bodySmall: { fontFamily: "Poppins-Regular", fontWeight: "400" }
    }
});
const roundness = (_f = tRadius === null || tRadius === void 0 ? void 0 : tRadius.md) !== null && _f !== void 0 ? _f : 16;
function base(theme) {
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
export const lightTheme = base(MD3LightTheme);
export const darkTheme = base(MD3DarkTheme);
//# sourceMappingURL=theme.js.map