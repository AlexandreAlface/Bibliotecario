// apps/mobile/src/providers/AppThemeProvider.tsx (excerto)
import { Provider as PaperProvider } from "react-native-paper";
import { LightTheme, DarkTheme } from "src/theme";

export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // se já tiveres useColorScheme/estado, mantém; aqui é só o merge das fonts
  const theme = LightTheme; // ou escolhe dark dinamicamente

  const themed = {
    ...theme,
    fonts: {
      ...theme.fonts,
      // mapeia Poppins para os pesos usados no MUI (Regular/Medium/Bold)
      // garante que carregaste as fontes primeiro!
      default: { ...theme.fonts?.default, fontFamily: "Poppins_400" },
    },
  } as typeof theme;

  return <PaperProvider theme={themed}>{children}</PaperProvider>;
}
