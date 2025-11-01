// apps/mobile/app/consultations/[id].tsx
import * as React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "src/contexts/AuthContext";
import ConsultationRoom from "src/features/consultations/ConsultationRoom";

export default function GlobalConsultationRoomScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();

  const role: "librarian" | "family" =
    user?.roles?.includes("LIBRARIAN") || user?.roles?.includes("ADMIN")
      ? "librarian"
      : "family";

  const numericId = Number(id);
  if (!id || Number.isNaN(numericId)) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
      <ConsultationRoom id={numericId} role={role} />
    </>
  );
}
