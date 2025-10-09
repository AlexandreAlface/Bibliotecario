/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/librarian/_layout.tsx
 * Layout: Área do Bibliotecário (tabs + guard)
 * Autor: Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 * Refactor (como combinado):
 * • Comentários detalhados PT-PT em TODO o código.
 * • Helpers PUROS documentados e com ≤ 30 linhas.
 * • Componentes legíveis, acessíveis e alinhados com o tema MD3.
 * • Mantido o comportamento original (mesma navegação/guards).
 * ============================================================================
 */

import * as React from "react";
import { View, TouchableOpacity } from "react-native";
import { Slot, Redirect, usePathname, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "src/contexts/AuthContext";

/* =============================================================================
 * Role / Permissões
 * ========================================================================== */

/**
 * isLibrarian — Determina se o utilizador tem perfil de bibliotecário.
 * PURO (≤ 30 linhas): não tem efeitos secundários; depende apenas do input.
 */
function isLibrarian(u: any): boolean {
  if (!u) return false;

  // Aceita esquemas comuns: user.roles (['BIBL', ...]) ou user.userRoles[{role:{name}}]
  const roles: string[] =
    Array.isArray(u.roles) && u.roles.length
      ? u.roles
      : Array.isArray(u.userRoles)
      ? u.userRoles.map((r: any) => r?.role?.name).filter(Boolean)
      : [];

  // Normaliza e procura “BIBL” (abreviações/variações)
  return roles.some((r) => String(r).toUpperCase().includes("BIBL"));
}

/* =============================================================================
 * Tabs — configuração (ordem, ícones, rótulos)
 * ========================================================================== */

type RouteName =
  | "Home"
  | "ConsultasPendentes"
  | "Agenda"
  | "Slots"
  | "historico"
  | "Familias";

/** Ordem fixa das tabs (evita reordenações por navegação dinâmica). */
const ORDER: RouteName[] = [
  "Home",
  "ConsultasPendentes",
  "Agenda",
  "Slots",
  "historico",
  "Familias",
];

/** Ícones e labels por rota (ativo/inativo). */
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

/* =============================================================================
 * TabBar personalizada — visual consistente com MD3
 * ========================================================================== */

/**
 * MyTabBar — Barra inferior customizada (usa cores/espessuras do tema).
 * Notas:
 * • Mantém apenas rotas declaradas em ORDER.
 * • Acessibilidade: role/label/selected + hitSlop generoso.
 */
function MyTabBar(props: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Mapeia as rotas do estado para a ordem fixa definida em ORDER.
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
        elevation: 8,
        borderTopWidth: 0.5,
        borderTopColor: theme.colors.outlineVariant,
      }}
      // Evita que leitores de ecrã interpretem como conteúdo.
      accessibilityRole="tablist"
    >
      {routes.map((route) => {
        const index = props.state.routes.findIndex((r) => r.key === route.key);
        const isFocused = props.state.index === index;
        const meta = ICONS[route.name as RouteName];

        // Navega para a tab (respeita listeners de tabPress).
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
            accessibilityRole="tab"
            accessibilityLabel={meta?.label ?? String(route.name)}
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

/* =============================================================================
 * Layout + Guards — proteção de rotas e tabs do bibliotecário
 * ========================================================================== */

/**
 * LibrarianLayout — Protege a área /librarian e renderiza as tabs.
 * Fluxo:
 * 1) Enquanto o Auth carrega → <Slot /> (estrutura estável).
 * 2) Sem sessão → /auth/login
 * 3) Sem role de bibliotecário → /family
 * 4) OK → mostra Tabs com a ordem/labels definidas acima.
 */
export default function LibrarianLayout() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // 1) Estado intermédio: mantém a árvore estável p/ evitar “flicker”.
  if (!ready) return <Slot />;

  // 2) Não autenticado → redireciona para login.
  if (!user) return <Redirect href="/auth/login" />;

  // 3) Sem perfil de bibliotecário → envia para a área “família”.
  if (!isLibrarian(user)) {
    if (pathname?.startsWith("/librarian")) return <Redirect href="/family" />;
    return <Redirect href="/family" />;
  }

  // 4) Autenticado + Bibliotecário → Tabs.
  return (
    <Tabs
      tabBar={(p) => <MyTabBar {...p} />}
      screenOptions={{ headerShown: false }}
    >
      {/* IMPORTANTE: Estes nomes devem bater certo com os ficheiros em /librarian */}
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="ConsultasPendentes" />
      <Tabs.Screen name="Agenda" />
      <Tabs.Screen name="Slots" />
      <Tabs.Screen name="historico" />
      <Tabs.Screen name="Familias" />
    </Tabs>
  );
}
