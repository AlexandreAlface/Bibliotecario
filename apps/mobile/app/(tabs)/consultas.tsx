import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";

import { useAuth } from "src/contexts/AuthContext";
import { ConsultationLite } from "src/services/consultations";

type TabKey = "next" | "past";
export type Status =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED"
  | undefined;

function fmtDateTime(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

/** ---------- Chips genéricos (usam tema) ---------- */
function PillChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
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

/** ---------- Cores fixas por estado (sem theme) ---------- */
const STATUS_STYLE: Record<
  Exclude<Status, undefined>,
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
  const key = (status ?? "PENDING") as Exclude<Status, undefined>;
  return STATUS_STYLE[key];
}

/** ---------- Chip de Estado (cores fixas) ---------- */
function StatusPill({
  status,
  active,
  onPress,
}: {
  status: Exclude<Status, undefined>;
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
      <Text
        style={{
          fontWeight: "700",
          color: active ? s.fg : s.accent,
        }}
      >
        {s.label}
      </Text>
    </TouchableOpacity>
  );
}
/** -------------------------------------------------- */

export default function ConsultasScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const actingChildId = user?.actingChild?.id ?? null;

  const [tab, setTab] = React.useState<TabKey>("next");

  // estados selecionáveis
  const STATUS_OPTIONS: { key: Exclude<Status, undefined>; label: string }[] = [
    { key: "PENDING", label: STATUS_STYLE.PENDING.label },
    { key: "CONFIRMED", label: STATUS_STYLE.CONFIRMED.label },
    { key: "COMPLETED", label: STATUS_STYLE.COMPLETED.label },
    { key: "CANCELLED", label: STATUS_STYLE.CANCELLED.label },
    { key: "DECLINED", label: STATUS_STYLE.DECLINED.label },
  ];
  const defaultNext = new Set<Exclude<Status, undefined>>([
    "PENDING",
    "CONFIRMED",
  ]);
  const defaultPast = new Set<Exclude<Status, undefined>>([
    "COMPLETED",
    "CANCELLED",
    "DECLINED",
  ]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    Set<Exclude<Status, undefined>>
  >(new Set(defaultNext));

  // datas (controladas) + visibilidade dos pickers
  const [fromDate, setFromDate] = React.useState<Date | null>(new Date());
  const [toDate, setToDate] = React.useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<ConsultationLite[]>([]);

  // alternar tab ajusta defaults
  React.useEffect(() => {
    if (tab === "next") {
      setSelectedStatuses(new Set(defaultNext));
      setFromDate(new Date());
      setToDate(null);
    } else {
      setSelectedStatuses(new Set(defaultPast));
      setFromDate(null);
      setToDate(new Date());
    }
  }, [tab]);

  const buildQueryUrl = React.useCallback(
    async (extra?: Record<string, any>) => {
      const nowIso = new Date().toISOString();
      const effectiveFrom = fromDate
        ? fromDate.toISOString()
        : tab === "next"
        ? nowIso
        : undefined;
      const effectiveTo = toDate
        ? toDate.toISOString()
        : tab === "past"
        ? nowIso
        : undefined;

      const statusParam =
        selectedStatuses.size > 0
          ? Array.from(selectedStatuses).join(",")
          : undefined;

      const effectiveChildId = actingChildId ?? undefined;

      const params = {
        familyId: user?.id,
        childId: effectiveChildId,
        status: statusParam,
        from: effectiveFrom,
        to: effectiveTo,
        order: tab === "next" ? "asc" : "desc",
        limit: 100,
        ...(extra ?? {}),
      };

      const q = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
        )
        .join("&");

      const { API_URL } = await import("src/services/api");
      return `${API_URL}/consultations/all?${q}`;
    },
    [user?.id, actingChildId, selectedStatuses, fromDate, toDate, tab]
  );

  const load = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const url = await buildQueryUrl();
      const data = (await fetch(url, { credentials: "include" }).then((r) =>
        r.json()
      )) as ConsultationLite[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, buildQueryUrl]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  function toggleStatus(s: Exclude<Status, undefined>) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function clearDates() {
    setFromDate(null);
    setToDate(null);
  }

  function setTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    setFromDate(start);
    setToDate(end);
  }

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
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.colors.onBackground,
            }}
          >
            Consultas
          </Text>

          {/* WhiteCard: Filtros */}
          <FlexibleCard
            title="Filtros"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Tabs Próximas/Anteriores */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <PillChip
                label="Próximas"
                active={tab === "next"}
                onPress={() => setTab("next")}
              />
              <PillChip
                label="Anteriores"
                active={tab === "past"}
                onPress={() => setTab("past")}
              />
            </View>

            {/* Estados */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Estados
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATUS_OPTIONS.map((opt) => (
                <StatusPill
                  key={opt.key}
                  status={opt.key}
                  active={selectedStatuses.has(opt.key)}
                  onPress={() => toggleStatus(opt.key)}
                />
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <SecondaryButton
                label="Limpar estados"
                onPress={() => setSelectedStatuses(new Set())}
              />
              <SecondaryButton
                label="Selecionar todos"
                onPress={() =>
                  setSelectedStatuses(new Set(STATUS_OPTIONS.map((o) => o.key)))
                }
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />

            {/* Datas (controladas; pickers só abrem ao tocar) */}
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Intervalo de datas
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* FROM */}
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => setShowFromPicker(true)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {fromDate
                      ? fmtDateTime(fromDate.toISOString())
                      : "Sem início"}
                  </Text>
                </TouchableOpacity>

                {showFromPicker && (
                  <DateTimePicker
                    mode="date"
                    value={fromDate ?? new Date()}
                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                      if (Platform.OS === "android") setShowFromPicker(false);
                      if (event.type === "set" && date) {
                        const newFrom = new Date(date);
                        setFromDate(newFrom);
                        // manter coerência: from <= to
                        if (toDate && newFrom > toDate) {
                          setToDate(newFrom);
                        }
                      }
                    }}
                  />
                )}

                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontSize: 12,
                  }}
                >
                  {fromDate
                    ? fmtDateTime(fromDate.toISOString())
                    : "Sem início"}
                </Text>
              </View>

              {/* TO */}
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => setShowToPicker(true)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {toDate
                      ? fmtDateTime(toDate.toISOString())
                      : "Sem fim"}
                  </Text>
                </TouchableOpacity>

                {showToPicker && (
                  <DateTimePicker
                    mode="date"
                    value={toDate ?? new Date()}
                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                    minimumDate={fromDate ?? undefined}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                      if (Platform.OS === "android") setShowToPicker(false);
                      if (event.type === "set" && date) {
                        const newTo = new Date(date);
                        setToDate(
                          fromDate && newTo < fromDate ? fromDate : newTo
                        );
                      }
                    }}
                  />
                )}

                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontSize: 12,
                  }}
                >
                  {toDate ? fmtDateTime(toDate.toISOString()) : "Sem fim"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <SecondaryButton label="Limpar datas" onPress={clearDates} />
              <SecondaryButton label="Hoje" onPress={setTodayRange} />
            </View>

            <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
              <PrimaryButton label="Aplicar filtros" onPress={load} />
            </View>
          </FlexibleCard>

          {/* WhiteCard: Lista */}
          <FlexibleCard
            title={tab === "next" ? "Próximas" : "Anteriores"}
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={12}
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} />
            ) : items.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  {tab === "next"
                    ? "Sem consultas marcadas."
                    : "Sem histórico de consultas."}
                </Text>
                <PrimaryButton
                  label="Agendar Consulta"
                  onPress={() => router.push("/agenda")}
                />
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {items.map((item) => {
                  const librarianName =
                    (item as any)?.librarianName ??
                    (item as any)?.librarian?.fullName ??
                    "";
                  const libraryName =
                    (item as any)?.libraryName ??
                    (item as any)?.library?.name ??
                    "";
                  const childName =
                    (item as any)?.childName ??
                    (item as any)?.child?.name ??
                    "";
                  const title =
                    item.title ??
                    (childName ? `Consulta de ${childName}` : "Consulta");

                  const meta = statusMeta(item.status);

                  return (
                    <View
                      key={String(item.id)}
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
                            <Text style={{ color: meta.fg, fontSize: 12 }}>
                              {meta.label}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            marginTop: 6,
                            color: theme.colors.onSurfaceVariant,
                          }}
                        >
                          {fmtDateTime(item.startAt)}
                          {librarianName ? ` • ${librarianName}` : ""}
                          {libraryName ? ` • ${libraryName}` : ""}
                        </Text>

                        {!!childName && (
                          <Text
                            style={{
                              marginTop: 2,
                              color: theme.colors.onSurfaceVariant,
                            }}
                          >
                            Criança: {childName}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
