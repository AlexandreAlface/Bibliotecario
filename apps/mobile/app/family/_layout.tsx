import * as React from "react";
import { View, TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";
import { TABBAR_HEIGHT } from "src/constants/layout";

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
  | "sugestoes"
  | "leituras"
  | "avaliacoes"
  | "eventos";

const ICONS: Record<
  RouteName,
  {
    active: React.ComponentProps<typeof Icon>["name"];
    inactive: React.ComponentProps<typeof Icon>["name"];
  }
> = {
  index: { active: "home-variant", inactive: "home-variant-outline" },
  sugestoes: { active: "magic-staff", inactive: "magic-staff" },
  agenda: { active: "calendar-month", inactive: "calendar-month-outline" },
  conquistas: { active: "trophy-award", inactive: "trophy-outline" },
  consultas: { active: "calendar-clock", inactive: "calendar-clock-outline" },
  familias: { active: "account-group", inactive: "account-group-outline" },
  feed: { active: "rss", inactive: "rss" },
  leituras: { active: "book-open-variant", inactive: "book-open-variant" },
  avaliacoes: { active: "star", inactive: "star-outline" },
  eventos: {
    active: "ticket-confirmation",
    inactive: "ticket-confirmation-outline",
  },
};

const MENU_FAMILIA: RouteName[] = [
  "index",
  "leituras",
  "avaliacoes",
  "eventos",
  "sugestoes",
  "agenda",
  "conquistas",
  "consultas",
  "familias",
];
const MENU_CRIANCA: RouteName[] = [
  "index",
  "leituras",
  "avaliacoes",
  "eventos",
  "sugestoes",
  "conquistas",
  "consultas",
];

function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Guard extra: durante transições (ex: logout), pode renderizar sem user
  const roles = React.useMemo(() => extractRoles(user), [user]);
  const role = user?.actingChild ? "CRIANÇA" : roles[0] ?? "FAMÍLIA";
  const visible = role === "CRIANÇA" ? MENU_CRIANCA : MENU_FAMILIA;

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
      {items.map((route) => {
        const isFocused =
          props.state.index ===
          props.state.routes.findIndex((r) => r.key === route.key);
        const name = route.name as RouteName;
        const iconPair = ICONS[name];
        if (!iconPair) return null;

        const iconName = isFocused ? iconPair.active : iconPair.inactive;
        const color = isFocused
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;

        const onPress = () => {
          const event = props.navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented)
            props.navigation.navigate(route.name);
        };
        const onLongPress = () =>
          props.navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.6}
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

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <MyTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
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
