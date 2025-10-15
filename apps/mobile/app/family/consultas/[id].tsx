// apps/mobile/app/family/consultas/[id].tsx
import * as React from "react";
import { useLocalSearchParams } from "expo-router";
import ConsultationRoom from "src/features/consultations/ConsultationRoom";

export default function FamilyConsultationRoomModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConsultationRoom id={Number(id)} role="family" />;
}
