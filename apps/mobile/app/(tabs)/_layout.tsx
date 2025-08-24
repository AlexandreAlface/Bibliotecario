// app/(tabs)/_layout.tsx
import * as React from "react";
import { View, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";

export const TABBAR_HEIGHT = 64;

/* ---- helpers ---- */
function extractRoles(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles.map((ur: any) => ur?.role?.name).filter(Boolean);
  }
  return [];
}

type RouteName =
  | "index"
  | "agenda"
  | "conquistas"
  | "consultas"
  | "familias"
  | "feed"
  | "sugestoes";

/** Ícones: ativo usa “filled”, inativo (quando existe) usa “outline” */
const ICONS: Record<
  RouteName,
  { active: React.ComponentProps<typeof Icon>["name"]; inactive: React.ComponentProps<typeof Icon>["name"] }
> = {
  index:      { active: "home-variant",           inactive: "home-variant-outline" },
  sugestoes:  { active: "magic-staff",            inactive: "magic-staff" },
  agenda:     { active: "calendar-month",         inactive: "calendar-month-outline" },
  conquistas: { active: "trophy-award",           inactive: "trophy-outline" },
  consultas:  { active: "calendar-clock",         inactive: "calendar-clock-outline" },
  familias:   { active: "account-group",          inactive: "account-group-outline" },
  feed:       { active: "rss",                    inactive: "rss" }, // sem outline
};

const MENU_FAMILIA: RouteName[] = [
  "index",
  "agenda",
  "conquistas",
  "consultas",
  "familias",
  "feed",
  "sugestoes",
];
const MENU_CRIANCA: RouteName[] = ["index", "sugestoes", "conquistas", "agenda"];

/* ---- Custom TabBar 100% compatível iOS/Android (usa navigation.navigate) ---- */
function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const roles = React.useMemo(() => extractRoles(user), [user]);
  const role = user?.actingChild ? "CRIANÇA" : roles[0] ?? "FAMÍLIA";
  const visible = role === "CRIANÇA" ? MENU_CRIANCA : MENU_FAMILIA;

  // filtra só as rotas que queremos MESMO mostrar no tab bar
  const items = props.state.routes.filter((r) =>
    (visible as string[]).includes(r.name)
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
      {items.map((route, index) => {
        const isFocused = props.state.index === props.state.routes.findIndex((r) => r.key === route.key);
        const name = route.name as RouteName;
        const iconPair = ICONS[name];
        if (!iconPair) return null;

        const iconName = isFocused ? iconPair.active : iconPair.inactive;
        const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;

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

        const onLongPress = () => {
          props.navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.6}              // funciona no iOS
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          >
            <Icon name={iconName} size={24} color={color} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---- Tabs layout ---- */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <MyTabBar {...p} />} screenOptions={{ headerShown: false }}>
      {/* Regista todas as screens que podes usar; o TabBar só mostra as do MENU_* */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="conquistas" />
      <Tabs.Screen name="consultas" />
      <Tabs.Screen name="familias" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="sugestoes" />
    </Tabs>
  );
}
