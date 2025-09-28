// apps/mobile/app/librarian/index.tsx
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

/** Helpers de data */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Tile para ações rápidas (layout vertical p/ caber o texto) */
function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
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

export default function LibrarianHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user;

  const displayName =
    user?.fullName || user?.name || user?.email || "Bibliotecário";
  const todayStr = React.useMemo(
    () =>
      new Intl.DateTimeFormat("pt-PT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(new Date()),
    []
  );

  const libraryLabel =
    (user as any)?.library?.name ||
    (user as any)?.libraryName ||
    (user as any)?.organization?.name ||
    undefined;

  // KPIs
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pendingToday, setPendingToday] = React.useState<number | null>(null);
  const [openSlotsToday, setOpenSlotsToday] = React.useState<number | null>(
    null
  );

  const loadStats = React.useCallback(async () => {
    if (!user?.id) {
      setPendingToday(0);
      setOpenSlotsToday(0);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const fromIso = startOfDay(now).toISOString();
      const toIso = endOfDay(now).toISOString();

      // Pedidos de consultas pendentes do bibliotecário (hoje)
      const params = new URLSearchParams({
        librarianId: String(user.id),
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
      setPendingToday(Array.isArray(pendingList) ? pendingList.length : 0);

      // Horários livres do bibliotecário (hoje)
      const slots = await consultationsApi.searchSlots({
        from: fromIso,
        to: toIso,
        librarianId: Number(user.id),
      });
      setOpenSlotsToday(Array.isArray(slots) ? slots.length : 0);
    } catch {
      setPendingToday(0);
      setOpenSlotsToday(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  // Logout com confirmação
  const onLogout = React.useCallback(() => {
    Alert.alert("Terminar sessão", "Queres mesmo sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          const anyAuth = auth as any;
          try {
            if (typeof anyAuth.logout === "function") {
              await anyAuth.logout();
            } else if (typeof anyAuth.signOut === "function") {
              await anyAuth.signOut();
            }
          } catch {
            // noop
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
          {/* Header compacto com botão de logout */}
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

                <Text style={{ opacity: 0.7, marginTop: 2 }}>
                  {todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}
                </Text>

                {/* chips de contexto */}
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

          {/* Ações rápidas -> rotas certas */}
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
                  onPress={() => router.push("/librarian/ConsultasPendentes")}
                />
                <QuickAction
                  icon="calendar-month-outline"
                  label="Agenda"
                  onPress={() => router.push("/librarian/Agenda")}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <QuickAction
                  icon="timetable"
                  label="Slots"
                  onPress={() => router.push("/librarian/Slots")}
                />
                <QuickAction
                  icon="account-search"
                  label="Famílias / Crianças"
                  onPress={() => router.push("/librarian/Familias")}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <QuickAction
                  icon="history"
                  label="Histórico"
                  onPress={() => router.push("/librarian/historico")}
                />
                {/* Espaço livre para futuro */}
                <View style={{ flex: 1, minWidth: 140 }} />
              </View>
            </View>
          </FlexibleCard>

          {/* Resumo com KPIs live */}
          <FlexibleCard
            title="Resumo rápido"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/librarian/consultas")}
                style={{
                  flexGrow: 1,
                  minWidth: 150,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon
                    name="calendar-clock"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={{ opacity: 0.7 }}>
                    Pedidos de consulta (hoje)
                  </Text>
                </View>
                <Text style={{ fontWeight: "900", fontSize: 22, marginTop: 6 }}>
                  {pendingToday === null || loading ? "—" : pendingToday}
                </Text>
              </TouchableOpacity>

              {/* Horários livres (hoje) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/librarian/slots")}
                style={{
                  flexGrow: 1,
                  minWidth: 150,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon
                    name="timetable"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={{ opacity: 0.7 }}>Horários livres (hoje)</Text>
                </View>
                <Text style={{ fontWeight: "900", fontSize: 22, marginTop: 6 }}>
                  {openSlotsToday === null || loading ? "—" : openSlotsToday}
                </Text>
              </TouchableOpacity>
            </View>
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
