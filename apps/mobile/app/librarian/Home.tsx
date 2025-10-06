/**
 * =====================================================================
 * Ficheiro: apps/mobile/app/librarian/index.tsx
 * Módulo: Ecrã inicial do Bibliotecário (atalhos + KPIs do dia)
 * Autor: Alexandre Brissos – Nº 21131
 * ---------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * =====================================================================
 */

import * as React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, Text, IconButton } from "react-native-paper";
import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useAuth } from "src/contexts/AuthContext";
import { consultationsApi } from "src/services/consultations";
import { API_URL } from "src/services/api";
import { useFocusEffect } from "@react-navigation/native";

/** =====================================================================
 * Helpers PUROS (datas, normalização e apresentação)
 * ===================================================================== */

/**
 * Devolve o início do dia para a data fornecida.
 * @param d Data base.
 * @returns Nova instância em 00:00:00.000.
 */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Devolve o fim do dia para a data fornecida.
 * @param d Data base.
 * @returns Nova instância em 23:59:59.999.
 */
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Converte um valor possivelmente indefinido num contador seguro.
 * Evita crashes e mantém comportamento “fail-safe”.
 */
function safeCount(list: unknown): number {
  return Array.isArray(list) ? list.length : 0;
}

/** Tipagem mínima para os campos usados do utilizador (sem impor esquema). */
type MinimalUser = {
  id?: number | string;
  fullName?: string;
  name?: string;
  email?: string;
  library?: { name?: string };
  libraryName?: string;
  organization?: { name?: string };
};

/** Nome a apresentar com fallback amigável. */
function getDisplayName(user?: MinimalUser | null): string {
  return user?.fullName || user?.name || user?.email || "Bibliotecário";
}

/** Etiqueta de biblioteca/organização de forma resiliente. */
function getLibraryLabel(user?: MinimalUser | null): string | undefined {
  return (
    user?.library?.name ||
    user?.libraryName ||
    user?.organization?.name ||
    undefined
  );
}

/** Texto “Hoje” em PT-PT com capitalização adequada. */
function getTodayLabel(): string {
  const s = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** =====================================================================
 * Componentes de UI atómica
 * ===================================================================== */

/**
 * Tile vertical para ações rápidas (texto mais legível).
 */
function QuickAction({
  icon,
  label,
  onPress,
}: {
  /** Nome do ícone do MaterialCommunityIcons. */
  icon: React.ComponentProps<typeof Icon>["name"];
  /** Texto curto do atalho. */
  label: string;
  /** Callback ao tocar. */
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        minWidth: 140,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Icon name={icon} size={22} color={theme.colors.primary} />
      <Text
        numberOfLines={2}
        style={{
          fontWeight: "700",
          color: theme.colors.onSurface,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Cartão do cabeçalho com saudação, contexto e botão de logout.
 */
function HeaderCard({
  displayName,
  todayStr,
  libraryLabel,
  onLogout,
}: {
  displayName: string;
  todayStr: string;
  libraryLabel?: string;
  onLogout: () => void;
}) {
  const theme = useTheme();
  return (
    <FlexibleCard
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={14}
      style={{ borderRadius: 12 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            variant="titleLarge"
            style={{ fontWeight: "900", color: theme.colors.onSurface }}
            numberOfLines={1}
          >
            Olá, {displayName} 👋
          </Text>

          <Text style={{ opacity: 0.7, marginTop: 2 }}>{todayStr}</Text>

          {/* Chips de contexto */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
            {!!libraryLabel && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: theme.colors.secondaryContainer,
                }}
              >
                <Icon
                  name="library"
                  size={14}
                  color={theme.colors.onSecondaryContainer}
                />
                <Text
                  style={{
                    color: theme.colors.onSecondaryContainer,
                    fontWeight: "700",
                  }}
                  numberOfLines={1}
                >
                  {libraryLabel}
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: theme.colors.secondaryContainer,
              }}
            >
              <Icon
                name="account-badge"
                size={14}
                color={theme.colors.onSecondaryContainer}
              />
              <Text
                style={{
                  color: theme.colors.onSecondaryContainer,
                  fontWeight: "700",
                }}
              >
                Bibliotecário
              </Text>
            </View>
          </View>
        </View>

        <IconButton
          icon="logout"
          onPress={onLogout}
          accessibilityLabel="Terminar sessão"
        />
      </View>
    </FlexibleCard>
  );
}

/**
 * Cartão com atalhos principais do módulo do bibliotecário.
 */
function QuickActionsCard({ go }: { go: (path: string) => void }) {
  const theme = useTheme();
  return (
    <FlexibleCard
      title="Ações rápidas"
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={14}
      style={{ borderRadius: 12 }}
    >
      <View style={{ rowGap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction
            icon="calendar-clock"
            label="Consultas pendentes"
            onPress={() => go("/librarian/ConsultasPendentes")}
          />
          <QuickAction
            icon="calendar-month-outline"
            label="Agenda"
            onPress={() => go("/librarian/Agenda")}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction
            icon="timetable"
            label="Slots"
            onPress={() => go("/librarian/Slots")}
          />
          <QuickAction
            icon="account-search"
            label="Famílias / Crianças"
            onPress={() => go("/librarian/Familias")}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuickAction
            icon="history"
            label="Histórico"
            onPress={() => go("/librarian/historico")}
          />
          {/* Espaço reservado a futuras ações */}
          <View style={{ flex: 1, minWidth: 140 }} />
        </View>
      </View>
    </FlexibleCard>
  );
}

/**
 * Cartão de KPIs diários com navegação rápida para os detalhes.
 */
function SummaryCard({
  pendingToday,
  openSlotsToday,
  loading,
  go,
}: {
  pendingToday: number | null;
  openSlotsToday: number | null;
  loading: boolean;
  go: (path: string) => void;
}) {
  const theme = useTheme();
  return (
    <FlexibleCard
      title="Resumo rápido"
      backgroundColor={theme.colors.surface}
      elevation={1}
      padding={14}
      style={{ borderRadius: 12 }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => go("/librarian/consultas")}
          style={{
            flexGrow: 1,
            minWidth: 150,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon
              name="calendar-clock"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={{ opacity: 0.7 }}>Pedidos de consulta (hoje)</Text>
          </View>
          <Text style={{ fontWeight: "900", fontSize: 22, marginTop: 6 }}>
            {pendingToday === null || loading ? "—" : pendingToday}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => go("/librarian/slots")}
          style={{
            flexGrow: 1,
            minWidth: 150,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="timetable" size={18} color={theme.colors.primary} />
            <Text style={{ opacity: 0.7 }}>Horários livres (hoje)</Text>
          </View>
          <Text style={{ fontWeight: "900", fontSize: 22, marginTop: 6 }}>
            {openSlotsToday === null || loading ? "—" : openSlotsToday}
          </Text>
        </TouchableOpacity>
      </View>
    </FlexibleCard>
  );
}

/** =====================================================================
 * Hook para KPIs do dia (sem efeitos colaterais externos)
 * ===================================================================== */

/**
 * Carrega e mantém os KPI's do dia para o bibliotecário.
 * - Sem alterar rotas nem comportamento de UI.
 * - Lida com ausência de `userId` de forma segura.
 */
function useDailyStats(userId?: number | string) {
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pendingToday, setPendingToday] = React.useState<number | null>(null);
  const [openSlotsToday, setOpenSlotsToday] = React.useState<number | null>(
    null
  );

  const loadStats = React.useCallback(async () => {
    if (!userId) {
      setPendingToday(0);
      setOpenSlotsToday(0);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const fromIso = startOfDay(now).toISOString();
      const toIso = endOfDay(now).toISOString();

      // Pedidos de consultas pendentes (hoje)
      const params = new URLSearchParams({
        librarianId: String(userId),
        status: "PENDING",
        from: fromIso,
        to: toIso,
        order: "asc",
        limit: "500",
      });
      const url = `${API_URL}/consultations/all?${params.toString()}`;
      const pendingList = await fetch(url, { credentials: "include" }).then(
        (r) => r.json()
      );
      setPendingToday(safeCount(pendingList));

      // Slots livres (hoje)
      const slots = await consultationsApi.searchSlots({
        from: fromIso,
        to: toIso,
        librarianId: Number(userId),
      });
      setOpenSlotsToday(safeCount(slots));
    } catch {
      // Falha silenciosa: mantemos a app utilizável
      setPendingToday(0);
      setOpenSlotsToday(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  }, [loadStats]);

  return { loading, refreshing, pendingToday, openSlotsToday, onRefresh };
}

/** =====================================================================
 * Ecrã principal
 * ===================================================================== */

/**
 * Ecrã inicial do Bibliotecário:
 * - Saudação + contexto
 * - Atalhos de navegação
 * - KPIs live de hoje
 */
export default function LibrarianHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user as MinimalUser | undefined;

  const displayName = React.useMemo(() => getDisplayName(user), [user]);
  const todayStr = React.useMemo(() => getTodayLabel(), []);
  const libraryLabel = React.useMemo(() => getLibraryLabel(user), [user]);

  const { loading, refreshing, pendingToday, openSlotsToday, onRefresh } =
    useDailyStats(user?.id);

  /** Navegação curta e explícita. */
  const go = React.useCallback(
    (path: string) => router.push(path as any),
    [router]
  );

  /** Terminar sessão com confirmação e “best effort” ao chamar o contexto. */
  const onLogout = React.useCallback(() => {
    Alert.alert("Terminar sessão", "Queres mesmo sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          const anyAuth = auth as any;
          try {
            if (typeof anyAuth.logout === "function") await anyAuth.logout();
            else if (typeof anyAuth.signOut === "function")
              await anyAuth.signOut();
          } catch {
            // Silencia erros de rede/estado — não bloqueia a UI.
          }
        },
      },
    ]);
  }, [auth]);

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Cabeçalho compacto */}
          <HeaderCard
            displayName={displayName}
            todayStr={todayStr}
            libraryLabel={libraryLabel}
            onLogout={onLogout}
          />

          {/* Ações rápidas -> rotas existentes */}
          <QuickActionsCard go={go} />

          {/* KPIs do dia */}
          <SummaryCard
            pendingToday={pendingToday}
            openSlotsToday={openSlotsToday}
            loading={loading}
            go={go}
          />
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
