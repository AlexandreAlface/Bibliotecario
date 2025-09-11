// apps/mobile/app/consultas/_layout.tsx
import { Stack } from 'expo-router';
import * as React from 'react';

export default function ConsultasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="agendar" options={{ title: 'Agendar Consulta' }} />
    </Stack>
  );
}
