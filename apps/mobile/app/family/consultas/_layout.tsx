// apps/mobile/app/family/consultas/_layout.tsx
import { Stack } from "expo-router";
import ConsultasTopSwitchFamily from "./ConsultasTopSwitchFamily";

export default function FamilyConsultasLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <ConsultasTopSwitchFamily />,
        headerBackVisible: false,
        headerLeft: () => null,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="agendar" />
      <Stack.Screen name="agenda" />
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
