import * as React from "react";
import { View, TouchableOpacity } from "react-native";
import { Slot, Redirect, usePathname, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";



/* ---------------- role helper ---------------- */
function isLibrarian(u: any): boolean {
  if (!u) return false;
  const roles: string[] =
    Array.isArray(u.roles) && u.roles.length
      ? u.roles
      : Array.isArray(u.userRoles)
      ? u.userRoles.map((r: any) => r?.role?.name).filter(Boolean)
      : [];
  return roles.some((r) => String(r).toUpperCase().includes("BIBL"));
}

/* ---------------- tabs config ---------------- */
type RouteName =
  | "Home"
  | "ConsultasPendentes"
  | "Agenda"
  | "Slots"
  | "historico"
  | "Familias";

const ORDER: RouteName[] = [
  "Home",
  "ConsultasPendentes",
  "Agenda",
  "Slots",
  "historico",
  "Familias",
];

const ICONS: Record<
  RouteName,
  {
    active: React.ComponentProps<typeof Icon>["name"];
    inactive: React.ComponentProps<typeof Icon>["name"];
    label: string;
  }
> = {
  Home: {
    active: "home-variant",
    inactive: "home-variant-outline",
    label: "Início",
  },
  ConsultasPendentes: {
    active: "calendar-clock",
    inactive: "calendar-clock-outline",
    label: "Pedidos",
  },
  Agenda: {
    active: "calendar-month",
    inactive: "calendar-month-outline",
    label: "Agenda",
  },
  Slots: { active: "calendar-plus", inactive: "calendar-plus", label: "Slots" },
  historico: { active: "history", inactive: "history", label: "Histórico" },
  Familias: {
    active: "account-group",
    inactive: "account-group-outline",
    label: "Famílias",
  },
};

/* ---------------- custom tab bar ---------------- */
function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // mantém apenas e por ordem fixa
  const routes = ORDER.map((name) =>
    props.state.routes.find((r) => r.name === name)
  ).filter(Boolean) as typeof props.state.routes;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 8),
        elevation: 8,
        borderTopWidth: 0.5,
        borderTopColor: theme.colors.outlineVariant,
      }}
    >
      {routes.map((route) => {
        const index = props.state.routes.findIndex((r) => r.key === route.key);
        const isFocused = props.state.index === index;
        const meta = ICONS[route.name as RouteName];

        const onPress = () => {
          const event = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            props.navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 4,
            }}
            hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          >
            <Icon
              name={isFocused ? meta.active : meta.inactive}
              size={24}
              color={
                isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant
              }
            />
            <Text
              style={{
                fontSize: 11,
                marginTop: 2,
                color: isFocused
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
              }}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------------- layout + guard ---------------- */
export default function LibrarianLayout() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // árvore estável enquanto carrega
  if (!ready) return <Slot />;

  // não autenticado → login
  if (!user) return <Redirect href="/auth/login" />;

  // sem perfil de bibliotecário → área família
  if (!isLibrarian(user)) {
    if (pathname?.startsWith("/librarian")) return <Redirect href="/family" />;
    return <Redirect href="/family" />;
  }

  // autenticado e com role de bibliotecário → tabs
  return (
    <Tabs
      tabBar={(p) => <MyTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      {/* IMPORTANTE: Estes nomes têm de corresponder aos ficheiros na pasta /librarian */}
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="ConsultasPendentes" />
      <Tabs.Screen name="Agenda" />
      <Tabs.Screen name="Slots" />
      <Tabs.Screen name="historico" />
      <Tabs.Screen name="Familias" />
    </Tabs>
  );
}
