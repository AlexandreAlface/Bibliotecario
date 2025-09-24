// apps/mobile/app/librarian/historico.tsx
import * as React from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text, IconButton } from "react-native-paper";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { FlatList } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import { SecondaryButton } from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import { API_URL } from "src/services/api";
import type { ConsultationLite } from "src/services/consultations";

/** ---------- Utils de datas ---------- */
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
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDateTime(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

/** ---------- Estados e estilos ---------- */
type Status = "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

const STATUS_STYLE: Record<
  Status,
  { label: string; bg: string; fg: string; accent: string }
> = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
  },
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    accent: "#F59E0B",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    accent: "#9CA3AF",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    accent: "#3B82F6",
  },
};

function statusMeta(status?: Status) {
  const key = (status ?? "PENDING") as Status;
  return STATUS_STYLE[key];
}

/** ---------- Chip reutilizável ---------- */
function PillChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: active
          ? theme.colors.primary
          : theme.colors.secondaryContainer,
        borderWidth: active ? 0 : 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      <Text
        style={{
          color: active
            ? theme.colors.onPrimary
            : theme.colors.onSecondaryContainer,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatusPill({
  status,
  active,
  onPress,
}: {
  status: Status;
  active: boolean;
  onPress: () => void;
}) {
  const s = STATUS_STYLE[status];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: active ? s.bg : "#FFFFFF",
        borderWidth: 1,
        borderColor: s.accent,
      }}
    >
      <Text style={{ fontWeight: "700", color: active ? s.fg : s.accent }}>
        {s.label}
      </Text>
    </TouchableOpacity>
  );
}

/** ---------- Modal Date Picker ---------- */
function DatePickerModal({
  visible,
  title,
  value,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const theme = useTheme();
  const [temp, setTemp] = React.useState<Date>(value);
  React.useEffect(() => {
    if (visible) setTemp(value);
  }, [visible, value]);

  const handleChange = (_: DateTimePickerEvent, d?: Date) => {
    if (d) setTemp(d);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{title}</Text>
          </View>

          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: Platform.OS === "ios" ? 8 : 0,
            }}
          >
            <DateTimePicker
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              value={temp}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outlineVariant,
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text style={{ color: theme.colors.onSurface }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(temp)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text
                style={{ color: theme.colors.onPrimary, fontWeight: "700" }}
              >
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** ---------- Página ---------- */
export default function HistoricoPage() {
  const theme = useTheme();
  const { user } = useAuth();

  // Filtros
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(false);

  // Status por defeito: históricos
  const HIST_STATUSES: Status[] = ["COMPLETED", "CANCELLED", "DECLINED"];
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<Status>>(
    new Set(HIST_STATUSES)
  );

  // Datas: últimos 30 dias → hoje
  const [fromDate, setFromDate] = React.useState<Date>(
    startOfDay(addDays(new Date(), -30))
  );
  const [toDate, setToDate] = React.useState<Date>(endOfDay(new Date()));

  // Modais
  const [showFrom, setShowFrom] = React.useState(false);
  const [showTo, setShowTo] = React.useState(false);

  const openFrom = React.useCallback(() => {
    setShowTo(false);
    setShowFrom(true);
  }, []);
  const openTo = React.useCallback(() => {
    setShowFrom(false);
    setShowTo(true);
  }, []);

  // Dados
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<ConsultationLite[]>([]);

  const activeFiltersCount =
    (selectedStatuses.size || 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const fetchData = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        librarianId: String(user.id),
        status:
          selectedStatuses.size > 0
            ? Array.from(selectedStatuses).join(",")
            : "",
        from: startOfDay(fromDate).toISOString(),
        to: endOfDay(toDate).toISOString(),
        order: "desc",
        limit: "200",
      });
      const url = `${API_URL}/consultations/all?${params.toString()}`;
      const data = await fetch(url, { credentials: "include" }).then((r) =>
        r.json()
      );
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStatuses, fromDate, toDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  function toggleStatus(s: Status) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function quickPreset(days: number) {
    const now = new Date();
    setFromDate(startOfDay(addDays(now, -days)));
    setToDate(endOfDay(now));
  }

  // Render de item
  const renderItem = ({ item }: { item: ConsultationLite }) => {
    const librarianName =
      (item as any)?.librarianName ?? (item as any)?.librarian?.fullName ?? "";
    const libraryName =
      (item as any)?.libraryName ?? (item as any)?.library?.name ?? "";
    const childName =
      (item as any)?.childName ?? (item as any)?.child?.name ?? "";
    const title =
      item.title ?? (childName ? `Consulta de ${childName}` : "Consulta");
    const meta = statusMeta(item.status as Status);

    return (
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 4, backgroundColor: meta.accent }} />
        <View style={{ padding: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.onSurface,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            <View
              style={{
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: meta.bg,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: meta.fg, fontSize: 12 }}>{meta.label}</Text>
            </View>
          </View>

          <Text style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
            {fmtDateTime(item.startAt)}
            {librarianName ? ` • ${librarianName}` : ""}
            {libraryName ? ` • ${libraryName}` : ""}
          </Text>

          {!!childName && (
            <Text
              style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}
            >
              Criança: {childName}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        {/* Cabeçalho */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.colors.onBackground,
            }}
          >
            Histórico de consultas
          </Text>
        </View>

        {/* Conteúdo */}
        <FlatList
          data={items}
          keyExtractor={(it) => String((it as any).id ?? Math.random())}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <FlexibleCard
              backgroundColor={theme.colors.surface}
              elevation={1}
              padding={14}
              style={{ borderRadius: 12, marginBottom: 12 }}
            >
              {/* Header filtros */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: theme.colors.onSurface,
                    }}
                  >
                    Filtros
                  </Text>
                  {!!activeFiltersCount && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: theme.colors.secondaryContainer,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.onSecondaryContainer,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        {activeFiltersCount}
                      </Text>
                    </View>
                  )}
                </View>

                <IconButton
                  icon={filtersCollapsed ? "chevron-down" : "chevron-up"}
                  onPress={() => setFiltersCollapsed((v) => !v)}
                />
              </View>

              {!filtersCollapsed && (
                <View style={{ marginTop: 10 }}>
                  {/* Estados */}
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 6,
                    }}
                  >
                    Estados
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {(["COMPLETED", "CANCELLED", "DECLINED"] as Status[]).map(
                      (s) => (
                        <StatusPill
                          key={s}
                          status={s}
                          active={selectedStatuses.has(s)}
                          onPress={() => toggleStatus(s)}
                        />
                      )
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <SecondaryButton
                      label="Limpar estados"
                      onPress={() => setSelectedStatuses(new Set())}
                    />
                    <SecondaryButton
                      label="Selecionar todos"
                      onPress={() =>
                        setSelectedStatuses(new Set(HIST_STATUSES))
                      }
                    />
                  </View>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.outlineVariant,
                      opacity: 0.6,
                      marginVertical: 12,
                    }}
                  />

                  {/* Datas */}
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 6,
                    }}
                  >
                    Intervalo de datas
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {/* FROM */}
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={openFrom}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surface,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Selecionar data inicial"
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {new Intl.DateTimeFormat("pt-PT", {
                            dateStyle: "medium",
                          }).format(fromDate)}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          fontSize: 12,
                        }}
                      >
                        {new Intl.DateTimeFormat("pt-PT", {
                          dateStyle: "medium",
                        }).format(fromDate)}
                      </Text>

                      <DatePickerModal
                        visible={showFrom}
                        title="Selecionar data inicial"
                        value={fromDate}
                        maximumDate={toDate}
                        onCancel={() => setShowFrom(false)}
                        onConfirm={(d) => {
                          const v = startOfDay(d);
                          setFromDate(v);
                          if (v > toDate) setToDate(endOfDay(v));
                          setShowFrom(false);
                        }}
                      />
                    </View>

                    {/* TO */}
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        onPress={openTo}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surface,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Selecionar data final"
                      >
                        <Text style={{ color: theme.colors.onSurface }}>
                          {new Intl.DateTimeFormat("pt-PT", {
                            dateStyle: "medium",
                          }).format(toDate)}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          fontSize: 12,
                        }}
                      >
                        {new Intl.DateTimeFormat("pt-PT", {
                          dateStyle: "medium",
                        }).format(toDate)}
                      </Text>

                      <DatePickerModal
                        visible={showTo}
                        title="Selecionar data final"
                        value={toDate}
                        minimumDate={fromDate}
                        onCancel={() => setShowTo(false)}
                        onConfirm={(d) => {
                          const v = endOfDay(d);
                          setToDate(v < fromDate ? endOfDay(fromDate) : v);
                          setShowTo(false);
                        }}
                      />
                    </View>
                  </View>

                  {/* Presets rápidos */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <SecondaryButton
                      label="Hoje"
                      onPress={() => {
                        const now = new Date();
                        setFromDate(startOfDay(now));
                        setToDate(endOfDay(now));
                      }}
                    />
                    <SecondaryButton
                      label="Última semana"
                      onPress={() => quickPreset(7)}
                    />
                    <SecondaryButton
                      label="Último mês"
                      onPress={() => quickPreset(30)}
                    />
                    <SecondaryButton
                      label="Últimos 3 meses"
                      onPress={() => quickPreset(90)}
                    />
                  </View>
                </View>
              )}
            </FlexibleCard>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                Sem resultados para os filtros aplicados.
              </Text>
            )
          }
        />
      </SafeAreaView>
    </Background>
  );
}
