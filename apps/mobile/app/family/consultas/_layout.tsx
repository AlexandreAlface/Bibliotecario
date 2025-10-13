// apps/mobile/app/family/consultas/_layout.tsx
import * as React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

/** Converte #RRGGBB para rgba(r,g,b,a). Aceita #RGB também. */
function rgba(hex: string, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  // usa só os últimos 6 dígitos caso venha #AARRGGBB
  if (h.length === 8) h = h.slice(2);
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Rótulos por rota
const LABELS: Record<string, string> = {
  agendar: "Agendar Consultas",
  agenda: "Agenda",
  // pendentes: "Pendentes",
  // historico: "Histórico",
};

// Ícones por rota
const ICONS: Record<string, string> = {
  agendar: "calendar-plus",
  agenda: "calendar-month",
  pendentes: "inbox-outline",
  historico: "history",
};

export default function FamilyConsultasTabsLayout() {
  const theme = useTheme();

  // transparências (um bocadinho mais opaco no Android)
  const SURFACE_ALPHA = Platform.OS === "ios" ? 0.82 : 0.9;
  const BORDER_ALPHA = 0.5;

  const tabBg = rgba(theme.colors.surface, SURFACE_ALPHA);
  const border = rgba(theme.colors.outlineVariant, BORDER_ALPHA);

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Safe area só no topo, transparente para deixar ver o gradiente */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }} />

      <TopTabs
        initialRouteName="agendar"
        screenOptions={({ route }) => ({
          tabBarLabel:
            LABELS[route.name] ??
            route.name.charAt(0).toUpperCase() + route.name.slice(1),

          // Cores
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,

          // Ícone
          tabBarShowIcon: true,
          tabBarIcon: ({ color }) => {
            const name = ICONS[route.name] ?? "dots-horizontal";
            return <Icon name={name as any} size={20} color={color} />;
          },

          // Tipografia/altura
          tabBarItemStyle: { height: 46 },
          tabBarLabelStyle: {
            fontSize: 15,
            fontWeight: "800",
            textTransform: "none",
            letterSpacing: 0.2,
            marginTop: 2,
          },

          // Indicador
          tabBarIndicatorStyle: {
            height: 3,
            borderRadius: 3,
            backgroundColor: theme.colors.primary,
            marginHorizontal: 16,
          },

          // Barra semi-transparente (mostra o que está por trás)
          tabBarStyle: {
            backgroundColor: tabBg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: border,
          },

          tabBarPressColor: rgba(theme.colors.secondaryContainer, 0.3),

          // Cena: transparente para não “bloquear” o gradiente dos ecrãs
          sceneContainerStyle: {
            backgroundColor: "transparent",
          },
        })}
      />
    </View>
  );
}
