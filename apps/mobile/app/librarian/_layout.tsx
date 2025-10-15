// apps\mobile\app\librarian\_layout.tsx

import * as React from "react";
import { Tabs, Slot, Redirect, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text } from "react-native-paper";
import { View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";

/* ---------- tipos/aliases ---------- */
type MdiIconName = React.ComponentProps<typeof Icon>["name"];

/* ---------- helpers ---------- */
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

type RouteName = "Home" | "consultas" | "Livros" | "Familias";
const ORDER: RouteName[] = ["Home", "consultas", "Livros", "Familias"];

const ICONS: Record<
  RouteName,
  { active: MdiIconName; inactive: MdiIconName; label: string }
> = {
  Home: { active: "home", inactive: "home-outline", label: "Início" },
  consultas: {
    active: "stethoscope",
    inactive: "stethoscope",
    label: "Consultas",
  },
  Livros: { active: "book", inactive: "book-outline", label: "Livros" },
  Familias: {
    active: "account-group",
    inactive: "account-group-outline",
    label: "Famílias",
  },
};

function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const routes = React.useMemo(
    () =>
      ORDER.map((name) => props.state.routes.find((r) => r.name === name))
        .filter(Boolean) as typeof props.state.routes,
    [props.state.routes]
  );

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 8),
        borderTopWidth: 0.5,
        borderTopColor: theme.colors.outlineVariant,
        elevation: 8,
      }}
      accessibilityRole="tablist"
    >
      {routes.map((route) => {
        const index = props.state.routes.findIndex((r) => r.key === route.key);
        const focused = props.state.index === index;
        const meta = ICONS[route.name as RouteName];

        const onPress = () => {
          const evt = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !evt.defaultPrevented)
            props.navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={meta?.label ?? String(route.name)}
            accessibilityState={focused ? { selected: true } : {}}
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
              name={focused ? meta.active : meta.inactive}
              size={24}
              color={
                focused ? theme.colors.primary : theme.colors.onSurfaceVariant
              }
            />
            <Text
              style={{
                fontSize: 11,
                marginTop: 2,
                color: focused
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
              }}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LibrarianLayout() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // guards fora das Tabs
  if (!ready) return <Slot />;
  if (!user) return <Redirect href="/auth/login" />;
  if (!isLibrarian(user)) {
    if (pathname?.startsWith("/librarian")) return <Redirect href="/family" />;
    return <Redirect href="/family" />;
  }

  // dentro das Tabs: apenas Tabs.Screen
  return (
    <Tabs tabBar={(p) => <MyTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="consultas" />
      <Tabs.Screen name="Livros" />
      <Tabs.Screen name="Familias" />
    </Tabs>
  );
}
