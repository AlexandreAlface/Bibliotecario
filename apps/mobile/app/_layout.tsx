import { Stack } from 'expo-router';
import * as React from 'react';
import 'react-native-reanimated';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from '@bibliotecario/ui-mobile';

export default function RootLayout() {
  const [loaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  if (!loaded) return null;

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
