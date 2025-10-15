// apps\mobile\app\librarian\consultas\_layout.tsx

import { Stack } from "expo-router";
import ConsultasTopSwitch from "./ConsultasTopSwitchLibrarian";

export default function ConsultasLayout() {
  const common = {
    headerTitle: () => <ConsultasTopSwitch />,
    headerBackVisible: false,   // <- esconde o back
    headerLeft: () => null,     // <- garante que não aparece nada à esquerda
  } as const;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Consultas" }} />
      <Stack.Screen name="agenda"    options={common} />
      <Stack.Screen name="pendentes" options={common} />
      <Stack.Screen name="slots"     options={common} />
      <Stack.Screen name="historico" options={common} />

      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}


