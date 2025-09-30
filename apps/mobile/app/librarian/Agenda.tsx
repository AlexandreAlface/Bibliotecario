// apps/mobile/app/librarian/agenda.tsx
import * as React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, Text, IconButton } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import { API_URL } from "src/services/api";
import {
  listLibrarianSlots,
  updateSlotStatus,
} from "src/services/librarian/consultations";

import { MaterialCommunityIcons as Icon } from "@expo/vector-icons"; // (se ainda não estiver neste ficheiro)

/* ---------------- helpers de data ---------------- */
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
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(d);
}
function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtRange(a?: string | null, b?: string | null) {
  if (!a || !b) return "";
  const A = new Date(a);
  const B = new Date(b);
  const day = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
    A
  );
  const t1 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(A);
  const t2 = new Intl.DateTimeFormat("pt-PT", { timeStyle: "short" }).format(B);
  return `${day} • ${t1} — ${t2}`;
}

/* ---------------- tipos ---------------- */

type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  librarianId?: number;
  librarianName?: string | null;
  libraryName?: string | null;
  // 👇 NOVO
  reservedByName?: string | null;
  reservedChildName?: string | null;
};

/* ---------------- Pill ---------------- */
function Pill({
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
      style={[
        styles.pill,
        {
          backgroundColor: active
            ? theme.colors.primary
            : theme.colors.secondaryContainer,
          borderColor: theme.colors.outlineVariant,
          borderWidth: active ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
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

/* ---------------- Modal de criação de Slot ---------------- */
function CreateSlotModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (start: Date, durationMinutes: number) => void;
}) {
  const theme = useTheme();
  const now = React.useMemo(() => new Date(), []);
  const defaultStart = React.useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(Math.min(Math.max(d.getHours(), 9), 18));
    return d;
  }, []);
  const [day, setDay] = React.useState<Date>(startOfDay(defaultStart));
  const [time, setTime] = React.useState<Date>(defaultStart);
  const [duration, setDuration] = React.useState<number>(30);

  React.useEffect(() => {
    if (visible) {
      setDay(startOfDay(defaultStart));
      setTime(defaultStart);
      setDuration(30);
    }
  }, [visible, defaultStart]);
  const startCombined = React.useMemo(() => {
    const s = new Date(day);
    s.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return s;
  }, [day, time]);

  return (
    <Modal
      visible={visible}
      transparent
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
          {/* <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.outlineVariant,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 16,
                color: theme.colors.onSurface,
              }}
            >
              Novo horário
            </Text>
          </View> */}

          <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
            <View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Data
              </Text>
              <DateTimePicker
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                value={day}
                minimumDate={startOfDay(now)}
                onChange={(_, d) => d && setDay(startOfDay(d))}
              />
            </View>
            <View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Hora de início
              </Text>
              <DateTimePicker
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "spinner"}
                value={time}
                onChange={(_, d) => d && setTime(d)}
              />
            </View>
            <View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Duração
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[30, 45, 60, 90].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setDuration(m)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor:
                        duration === m
                          ? theme.colors.primary
                          : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.outlineVariant,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          duration === m
                            ? theme.colors.onPrimary
                            : theme.colors.onSurface,
                        fontWeight: "700",
                      }}
                    >
                      {m} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ marginTop: 6, opacity: 0.7 }}>
                {fmtDate(startCombined)} • {fmtTime(startCombined)} ({duration}{" "}
                min)
              </Text>
            </View>
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
              onPress={() => onConfirm(startCombined, duration)}
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
                Criar horário
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------------- página ---------------- */
type RangeKey = "today" | "tomorrow" | "next3" | "next7" | "all";

export default function AgendaPage() {
  const theme = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const [range, setRange] = React.useState<RangeKey>("today");

  // “Hoje” começa AGORA; restantes com [from,to] fechado
  const { fromIso, toIso } = React.useMemo(() => {
    const now = new Date();

    if (range === "today") {
      return {
        fromIso: now.toISOString(), // ← começa na hora atual
        toIso: endOfDay(now).toISOString(),
      };
    }
    if (range === "tomorrow") {
      const t = addDays(startOfDay(now), 1);
      return { fromIso: t.toISOString(), toIso: endOfDay(t).toISOString() };
    }
    if (range === "next3") {
      return {
        fromIso: now.toISOString(),
        toIso: endOfDay(addDays(now, 3)).toISOString(),
      };
    }
    if (range === "next7") {
      return {
        fromIso: now.toISOString(),
        toIso: endOfDay(addDays(now, 7)).toISOString(),
      };
    }
    // all → 180 dias para a frente
    return {
      fromIso: now.toISOString(),
      toIso: endOfDay(addDays(now, 180)).toISOString(),
    };
  }, [range]);

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listLibrarianSlots(Number(user.id), {
        from: fromIso,
        to: toIso,
      });
      const rows: Slot[] = (Array.isArray(data) ? data : []).map((s: any) => ({
        id: Number(s.id),
        startAt: s.startAt,
        endAt: s.endAt,
        status: (s.status || "OPEN").toUpperCase(),
        librarianId: s.librarianId ?? user.id,
        librarianName: s.librarianName ?? s.librarian?.fullName ?? null,
        libraryName: s.libraryName ?? s.library?.name ?? null,
      }));
      setSlots(rows);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fromIso, toIso]);

  React.useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // criar slot (single)
  const [showCreate, setShowCreate] = React.useState(false);
  const createSlot = React.useCallback(
    async (start: Date, durationMinutes: number) => {
      if (!user?.id) return;
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      try {
        await fetch(`${API_URL}/consultations/slots`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            librarianId: Number(user.id),
          }),
        }).then(async (r) => {
          if (!r.ok)
            throw new Error((await r.text()) || "Falha ao criar horário");
        });
        setShowCreate(false);
        await load();
      } catch (e: any) {
        Alert.alert("Erro", e?.message || "Não foi possível criar o horário.");
      }
    },
    [user?.id, load]
  );

  // bloquear / desbloquear
  const blockSlot = React.useCallback((id: number) => {
    Alert.alert("Bloquear horário", "Queres bloquear este horário?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Bloquear",
        style: "destructive",
        onPress: async () => {
          setBusyId(id);
          try {
            await updateSlotStatus(id, "BLOCKED");
            setSlots((prev) =>
              prev.map((s) => (s.id === id ? { ...s, status: "BLOCKED" } : s))
            );
          } catch (e: any) {
            Alert.alert(
              "Erro",
              e?.message || "Não foi possível bloquear o horário."
            );
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }, []);

  const unblockSlot = React.useCallback((id: number) => {
    Alert.alert("Desbloquear horário", "Queres desbloquear este horário?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desbloquear",
        onPress: async () => {
          setBusyId(id);
          try {
            await updateSlotStatus(id, "OPEN");
            setSlots((prev) =>
              prev.map((s) => (s.id === id ? { ...s, status: "OPEN" } : s))
            );
          } catch (e: any) {
            Alert.alert(
              "Erro",
              e?.message || "Não foi possível desbloquear o horário."
            );
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }, []);

  // chip de estado
  const StatusPill = ({ status }: { status: Slot["status"] }) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      OPEN: { bg: "#DCFCE7", fg: "#166534", label: "Disponível" },
      BOOKED: { bg: "#DBEAFE", fg: "#1E3A8A", label: "Reservado" },
      BLOCKED: { bg: "#FEE2E2", fg: "#991B1B", label: "Bloqueado" },
    };
    const s = map[(status || "OPEN").toUpperCase()] || map.OPEN;
    return (
      <View
        style={{
          alignSelf: "flex-start",
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 999,
          backgroundColor: s.bg,
        }}
      >
        <Text style={{ color: s.fg, fontWeight: "700", fontSize: 12 }}>
          {s.label}
        </Text>
      </View>
    );
  };

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
          {/* ===== Header Top: título + ícone ===== */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={16}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
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
                  name="calendar-month"
                  size={22}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
              >
                Agenda
              </Text>
            </View>
          </FlexibleCard>

          {/* ===== Filtros + criar ===== */}
          <FlexibleCard
            title="Filtros"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* (removido o <Text> "Agenda — Horários") */}

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 2,
                alignItems: "center",
              }}
            >
              <Pill
                label="Hoje"
                active={range === "today"}
                onPress={() => setRange("today")}
              />
              <Pill
                label="Amanhã"
                active={range === "tomorrow"}
                onPress={() => setRange("tomorrow")}
              />
              <Pill
                label="Próx. 3 dias"
                active={range === "next3"}
                onPress={() => setRange("next3")}
              />
              <Pill
                label="Próx. 7 dias"
                active={range === "next7"}
                onPress={() => setRange("next7")}
              />
              <Pill
                label="Todos"
                active={range === "all"}
                onPress={() => setRange("all")}
              />
            </View>

            {/* Botão criar slot (mantens comentado se quiseres) */}
            {/* <View style={{ marginTop: 12 }}>
              <PrimaryButton label="Novo horário" onPress={() => setShowCreate(true)} />
            </View> */}
          </FlexibleCard>

          {/* ===== Lista de slots ===== */}
          <FlexibleCard
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={12}
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} />
            ) : slots.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    textAlign: "center",
                  }}
                >
                  Sem horários para o intervalo selecionado.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {slots.map((s) => {
                  const isFuture = new Date(s.startAt).getTime() > Date.now();
                  const canBlock = s.status === "OPEN" && isFuture;
                  const canUnblock = s.status === "BLOCKED" && isFuture;

                  return (
                    <View
                      key={s.id}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        overflow: "hidden",
                      }}
                    >
                      <View style={{ padding: 12, gap: 6 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: "700",
                              fontSize: 16,
                              color: theme.colors.onSurface,
                            }}
                          >
                            {fmtRange(s.startAt, s.endAt)}
                          </Text>
                          <StatusPill status={s.status} />
                        </View>

                        {!!(s.libraryName || s.librarianName) && (
                          <Text
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {[s.librarianName, s.libraryName]
                              .filter(Boolean)
                              .join(" • ")}
                          </Text>
                        )}

                        {s.status === "BOOKED" &&
                        (s.reservedByName || s.reservedChildName) ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Icon
                              name="account-check"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text style={{ color: theme.colors.onSurface }}>
                              Reservado por{" "}
                              <Text style={{ fontWeight: "700" }}>
                                {s.reservedByName ?? "—"}
                              </Text>
                              {s.reservedChildName ? (
                                <Text style={{ color: theme.colors.onSurface }}>
                                  {" "}
                                  (para {s.reservedChildName})
                                </Text>
                              ) : null}
                            </Text>
                          </View>
                        ) : null}

                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            marginTop: 6,
                            alignItems: "center",
                          }}
                        >
                          <IconButton
                            icon="lock"
                            mode="outlined"
                            disabled={!canBlock || busyId === s.id}
                            onPress={() => blockSlot(s.id)}
                            accessibilityLabel="Bloquear horário"
                          />
                          <IconButton
                            icon="lock-open-variant"
                            mode="outlined"
                            disabled={!canUnblock || busyId === s.id}
                            onPress={() => unblockSlot(s.id)}
                            accessibilityLabel="Desbloquear horário"
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>

      {/* Modal de criação */}
      <CreateSlotModal
        visible={showCreate}
        onCancel={() => setShowCreate(false)}
        onConfirm={createSlot}
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
});
