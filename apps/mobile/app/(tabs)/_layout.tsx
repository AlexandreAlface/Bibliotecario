// app/(tabs)/_layout.tsx
import * as React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useAuth } from "src/contexts/AuthContext";

export const TABBAR_HEIGHT = 70;

function getIconName(routeName: string): string {
  switch (routeName) {
    case "index":
      return "home";
    case "agenda":
      return "calendar";
    case "consultas":
      return "calendar-clock";
    case "sugestoes":
      return "star";
    case "conquistas":
      return "trophy";
    case "pedidos":
      return "email";
    case "familias":
      return "account-multiple";
    case "feed":
      return "rss";
    case "perfil":
      return "account";
    default:
      return "circle";
  }
}

function extractRoles(u: any): string[] {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length) return u.roles as string[];
  if (Array.isArray(u.userRoles)) {
    return u.userRoles.map((ur: any) => ur?.role?.name).filter(Boolean) as string[];
  }
  return [];
}

function allowedRoutesByUser(user: any): Set<string> {
  const base = ['index', 'feed', 'perfil'];
  const roles = extractRoles(user);
  const primary = user?.actingChild ? 'CRIANÇA' : (roles[0] ?? 'FAMÍLIA');

  if (primary === 'FAMÍLIA')       return new Set([...base, 'agenda', 'consultas']);
  if (primary === 'CRIANÇA')       return new Set([...base, 'sugestoes', 'conquistas']);
  if (primary === 'BIBLIOTECÁRIO') return new Set([...base, 'pedidos', 'familias']);
  if (primary === 'ADMIN')         return new Set(base);
  return new Set(base);
}

// TabBar com ícones-only + filtra rotas por role
function IconOnlyTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const role = user?.roles?.[0] ?? "FAMÍLIA";
  const allowed = allowedRoutesByUser(role);

  // lista de rotas visíveis (apenas as permitidas)
  const visibleRoutes = state.routes.filter((r: any) => allowed.has(r.name));

  // se a rota ativa não é permitida, força ir para 'index'
  React.useEffect(() => {
    const current = state.routes[state.index]?.name;
    if (current && !allowed.has(current)) navigation.navigate("index");
  }, [state.index, role]);

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.row}>
        {visibleRoutes.map((route: any) => {
          const index = state.routes.findIndex((r: any) => r.key === route.key);
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const iconName = getIconName(route.name);
          const label = options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const e = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !e.defaultPrevented)
                  navigation.navigate(route.name);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={isFocused ? { selected: true } : {}}
              style={styles.item}
            >
              <View
                style={[
                  styles.iconWrap,
                  isFocused && {
                    backgroundColor: theme.colors.secondaryContainer,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={26}
                  color={
                    isFocused
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFocused
                      ? theme.colors.primary
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  // NOTA: filhos diretos **apenas** <Tabs.Screen />, sem fragments/arrays/condicionais
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
      tabBar={(props) => <IconOnlyTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Início" }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda" }} />
      <Tabs.Screen name="consultas" options={{ title: "Consultas" }} />
      <Tabs.Screen name="sugestoes" options={{ title: "Sugestões" }} />
      <Tabs.Screen name="conquistas" options={{ title: "Conquistas" }} />
      <Tabs.Screen name="pedidos" options={{ title: "Pedidos" }} />
      <Tabs.Screen name="familias" options={{ title: "Famílias" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: TABBAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: "center", gap: 6 },
  iconWrap: { padding: 10, borderRadius: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
