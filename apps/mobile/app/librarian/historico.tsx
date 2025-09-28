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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text, IconButton } from "react-native-paper";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

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
  { label: string; bg: string; fg: string; accent: string; icon: string }
> = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
    icon: "check-circle-outline",
  },
  PENDING: {
    label: "Pendente",
    bg: "#FFEDD5",
    fg: "#9A3412",
    accent: "#F59E0B",
    icon: "clock-outline",
  },
  DECLINED: {
    label: "Recusada",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
    icon: "close-circle-outline",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "#E5E7EB",
    fg: "#374151",
    accent: "#9CA3AF",
    icon: "cancel",
  },
  COMPLETED: {
    label: "Concluída",
    bg: "#DBEAFE",
    fg: "#1E3A8A",
    accent: "#3B82F6",
    icon: "check-decagram-outline",
  },
};

function statusMeta(status?: Status) {
  const key = (status ?? "PENDING") as Status;
  return STATUS_STYLE[key];
}

/** ---------- Chip de estado ---------- */
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
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon name={s.icon as any} size={14} color={active ? s.fg : s.accent} />
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
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon
              name="calendar-month-outline"
              size={18}
              color={theme.colors.onSurface}
            />
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

  // ---------- Paginação com limite fixo ----------
  const PAGE_SIZE = 10; // ← limite máximo por página
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageItems = React.useMemo(
    () => items.slice(startIdx, endIdx),
    [items, startIdx, endIdx]
  );
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const activeFiltersCount =
    (selectedStatuses.size || 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const fetchData = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setPage(1);
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
        // Mantemos um teto alto no fetch e aplicamos o limite por página no cliente.
        // Se a API suportar offset/página no futuro, é só trocar aqui.
        limit: "200",
      });
      const url = `${API_URL}/consultations/all?${params.toString()}`;
      const data = await fetch(url, { credentials: "include" }).then((r) =>
        r.json()
      );
      setItems(Array.isArray(data) ? data : []);
      setPage(1); // reset na mudança de filtros
    } catch {
      setItems([]);
      setPage(1);
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

  // White card de cada consulta (mantido)
  function ConsultationCard({ item }: { item: ConsultationLite }) {
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
      <FlexibleCard
        backgroundColor={theme.colors.surface}
        elevation={1}
        padding={12}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {/* título + estado */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flex: 1,
            }}
          >
            <Icon
              name="clipboard-text-clock-outline"
              size={18}
              color={theme.colors.onSurface}
            />
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
          </View>
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: meta.bg,
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name={meta.icon as any} size={14} color={meta.fg} />
            <Text style={{ color: meta.fg, fontSize: 12 }}>{meta.label}</Text>
          </View>
        </View>

        {/* metadata com ícones */}
        <View style={{ marginTop: 8, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon
              name="calendar-month-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {fmtDateTime(item.startAt)}
            </Text>
          </View>

          {(librarianName || libraryName) && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Icon
                name="office-building"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {[librarianName, libraryName].filter(Boolean).join(" • ")}
              </Text>
            </View>
          )}

          {!!childName && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Icon
                name="account-child-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Criança: {childName}
              </Text>
            </View>
          )}
        </View>
      </FlexibleCard>
    );
  }

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header (ícone + título) */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.primaryContainer,
                }}
              >
                <Icon
                  name="history"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
              >
                Histórico de consultas
              </Text>
            </View>
          </FlexibleCard>

          {/* Filtros */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
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
                <Icon
                  name="filter-variant"
                  size={18}
                  color={theme.colors.onSurface}
                />
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Icon
                    name="checkbox-marked-circle-outline"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Estados
                  </Text>
                </View>
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

                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <SecondaryButton
                    label="Limpar estados"
                    onPress={() => setSelectedStatuses(new Set())}
                  />
                  <SecondaryButton
                    label="Selecionar todos"
                    onPress={() => setSelectedStatuses(new Set(HIST_STATUSES))}
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Icon
                    name="calendar-range"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Intervalo de datas
                  </Text>
                </View>

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
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar data inicial"
                    >
                      <Icon
                        name="calendar-start"
                        size={18}
                        color={theme.colors.onSurface}
                      />
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
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar data final"
                    >
                      <Icon
                        name="calendar-end"
                        size={18}
                        color={theme.colors.onSurface}
                      />
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

          {/* ---------- RESULTADOS (lista de consultas dentro de UM FlexibleCard) ---------- */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* header do bloco */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="clipboard-list-outline"
                  size={18}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.onSurface,
                  }}
                >
                  Resultados
                </Text>
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
                    {items.length}
                  </Text>
                </View>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 12 }} />
            ) : items.length === 0 ? (
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Sem resultados para os filtros aplicados.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {pageItems.map((it) => (
                  <ConsultationCard
                    key={String((it as any).id ?? Math.random())}
                    item={it}
                  />
                ))}

                {/* Paginador dentro do card */}
                <View style={{ marginTop: 6, alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconButton
                      icon="chevron-left"
                      disabled={!canPrev}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    />
                    <Text style={{ marginHorizontal: 6 }}>
                      Página {page} de {totalPages}
                    </Text>
                    <IconButton
                      icon="chevron-right"
                      disabled={!canNext}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    />
                  </View>
                </View>
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
