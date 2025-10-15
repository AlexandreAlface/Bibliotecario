// src/features/consultations/ConsultationsHeader.tsx
import * as React from "react";
import { View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

type Props = {
  title?: string;
  onRefresh?: () => void;
  onFilter?: () => void;
  showFilter?: boolean;
};

export default function ConsultationsHeader({
  title = "Consultas",
  onRefresh,
  onFilter,
  showFilter = true,
}: Props) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.onSurface }}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {showFilter && (
          <IconButton
            icon="tune-variant"
            onPress={onFilter}
            accessibilityLabel="Filtrar"
          />
        )}
        <IconButton
          icon="refresh"
          onPress={onRefresh}
          accessibilityLabel="Atualizar"
        />
      </View>
    </View>
  );
}
