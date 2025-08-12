import { Slot } from "expo-router";
import { ThemeProvider } from "@bibliotecario/ui-mobile";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from "@expo-google-fonts/poppins";

export default function Layout() {
  const [loaded] = useFonts({
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
  });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
