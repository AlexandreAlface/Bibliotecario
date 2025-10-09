/**
 * ============================================================================
 *  Ficheiro: apps/mobile/app/(tabs)/_layout.tsx
 *  Autor:    Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 *  Objetivo:
 *    - Layout principal com tabs (Expo Router).
 *    - TabBar customizada e dinâmica consoante o papel (Família / Criança).
 *
 *  Reforços aplicados:
 *    • Comentários em PT-PT + JSDoc.
 *    • Helpers **puros** e curtos (≤ 30 linhas) para testabilidade.
 *    • Componentes pequenos/coesos (TabBarItem).
 *    • Tipagem explícita e mapeamento de ícones centralizado.
 * ============================================================================
 */

import * as React from "react";
import { View, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";
import { TABBAR_HEIGHT } from "src/constants/layout";

/* ============================ Tipos & Constantes ============================ */

/** Nomes de rotas suportadas no Tab Navigator. */
type RouteName =
  | "index"
  | "agenda"
  | "conquistas"
  | "consultas"
  | "familias"
  | "feed"
  | "sugestoes"
  | "leituras"
  | "avaliacoes"
  | "eventos";

/** Mapa de ícones para cada rota (ativo/inativo). */
const ICONS: Record<
  RouteName,
  {
    active: React.ComponentProps<typeof Icon>["name"];
    inactive: React.ComponentProps<typeof Icon>["name"];
  }
> = {
  index: { active: "home-variant", inactive: "home-variant-outline" },
  feed: { active: "rss", inactive: "rss" },
  sugestoes: { active: "magic-staff", inactive: "magic-staff" },
  agenda: { active: "calendar-month", inactive: "calendar-month-outline" },
  conquistas: { active: "trophy-award", inactive: "trophy-outline" },
  consultas: { active: "calendar-clock", inactive: "calendar-clock-outline" },
  familias: { active: "account-group", inactive: "account-group-outline" },
  leituras: { active: "book-open-variant", inactive: "book-open-variant" },
  avaliacoes: { active: "star", inactive: "star-outline" },
  eventos: {
    active: "ticket-confirmation",
    inactive: "ticket-confirmation-outline",
  },
};

/** Menu visível para Família (sem actingChild). */
const MENU_FAMILIA: RouteName[] = [
  "index",
  "feed",
  "leituras",
  "avaliacoes",
  "eventos",
  "sugestoes",
  "agenda",
  "conquistas",
  "consultas",
  "familias",
];

/** Menu visível quando a sessão está “em modo criança”. */
const MENU_CRIANCA: RouteName[] = [
  "index",
  "feed",
  "leituras",
  "avaliacoes",
  "eventos",
  "sugestoes",
  "conquistas",
  "consultas",
];

/* ================================ Helpers PUROS =============================== */

/** Extrai a lista de roles do utilizador em formato string. (PURO) */
function extractRoles(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles.map((ur: any) => ur?.role?.name).filter(Boolean);
  }
  return [];
}

/** Determina o papel atual para o TabBar (“CRIANÇA” se actingChild). (PURO) */
function resolveRole(user: any): "CRIANÇA" | "FAMÍLIA" | string {
  if (!user) return "FAMÍLIA";
  if (user?.actingChild) return "CRIANÇA";
  return extractRoles(user)[0] ?? "FAMÍLIA";
}

/** Devolve o array de rotas visíveis consoante o papel. (PURO) */
function visibleMenuForRole(role: string): RouteName[] {
  return role === "CRIANÇA" ? MENU_CRIANCA : MENU_FAMILIA;
}

/** Devolve o nome do ícone para a rota, dada a seleção. (PURO) */
function iconForRoute(name: RouteName, focused: boolean) {
  const pair = ICONS[name];
  return focused ? pair?.active : pair?.inactive;
}

/** Determina se a route está focada no estado atual. (PURO) */
function isFocusedRoute(state: BottomTabBarProps["state"], routeKey: string) {
  const idx = state.routes.findIndex((r) => r.key === routeKey);
  return state.index === idx;
}

/* ============================== Componentes UI =============================== */

type TabBarItemProps = {
  route: BottomTabBarProps["state"]["routes"][number];
  nav: BottomTabBarProps["navigation"];
  focused: boolean;
};

/** Um botão simples da TabBar (≤ 30 linhas). */
function TabBarItem({ route, nav, focused }: TabBarItemProps) {
  const theme = useTheme();
  const name = route.name as RouteName;
  const iconName = iconForRoute(name, focused);
  const color = focused ? theme.colors.primary : theme.colors.onSurfaceVariant;

  const onPress = () => {
    const evt = nav.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !evt.defaultPrevented) nav.navigate(route.name);
  };
  const onLongPress = () =>
    nav.emit({ type: "tabLongPress", target: route.key });

  if (!iconName) return null;
  return (
    <TouchableOpacity
      key={route.key}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <Icon name={iconName} size={24} color={color} />
    </TouchableOpacity>
  );
}

/** TabBar customizada: filtra rotas visíveis e desenha botões. */
function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const role = React.useMemo(() => resolveRole(user), [user]);
  const visibleNames = React.useMemo(() => visibleMenuForRole(role), [role]);
  const routes = React.useMemo(
    () =>
      props.state.routes.filter((r) =>
        (visibleNames as string[]).includes(r.name)
      ),
    [props.state.routes, visibleNames]
  );

  return (
    <View
      style={{
        flexDirection: "row",
        height: TABBAR_HEIGHT + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8,
        backgroundColor: theme.colors.surface,
        elevation: 8,
      }}
    >
      {routes.map((route) => (
        <TabBarItem
          key={route.key}
          route={route}
          nav={props.navigation}
          focused={isFocusedRoute(props.state, route.key)}
        />
      ))}
    </View>
  );
}

/* ================================ Tabs Layout ================================= */

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <MyTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" /> {/* Rota do feed (micro-conteúdos/eventos) */}
      <Tabs.Screen name="leituras" />
      <Tabs.Screen name="avaliacoes" />
      <Tabs.Screen name="eventos" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="consultas" />
      <Tabs.Screen name="conquistas" />
      <Tabs.Screen name="familias" />
      <Tabs.Screen name="sugestoes" />
    </Tabs>
  );
}

/* ============================================================================ *
 *  Fim — Alexandre Brissos — Nº 21131
 * ============================================================================ */
