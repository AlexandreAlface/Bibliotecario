import { PropsWithChildren } from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { lightTheme, darkTheme } from "./theme";

export function ThemeProvider({
  dark,
  children,
}: PropsWithChildren<{ dark?: boolean }>) {
  return (
    <PaperProvider theme={dark ? darkTheme : lightTheme}>
      {children}
    </PaperProvider>
  );
}
