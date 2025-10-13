/**
 * ============================================================================
 * Ficheiro: apps/mobile/app/librarian/agenda.tsx
 * Ecrã: Agenda do Bibliotecário — listagem e gestão de horários (slots)
 * Autor: Alexandre Brissos — Nº 21131
 * ----------------------------------------------------------------------------
 * Reforço conforme combinado:
 *  • Comentários em PT-PT em TODO o ficheiro.
 *  • Helpers/métodos puros (sem efeitos) e curtos (≤ 30 linhas).
 *  • Acessibilidade e UX consistentes com MD3 (react-native-paper).
 *  • Mantido o comportamento original (sem regressões funcionais).
 * ============================================================================
 */

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
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, Text, IconButton } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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

/* =============================================================================
 * Helpers de data/tempo — PUROS e curtos (≤ 30 linhas)
 * ========================================================================== */

/** startOfDay — devolve o início do dia local (00:00:00.000). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** endOfDay — devolve o fim do dia local (23:59:59.999). */
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** addDays — adiciona N dias a uma data sem mutar o original. */
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** pad2 — zero-left pad para horas/minutos. */
function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** fmtDate — data “medium” em pt-PT. */
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(d);
}

/** fmtTime — HH:mm local. */
function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * fmtRange — string amigável "dia • h1 — h2" a partir de ISO strings.
 * Aceita ausências e devolve "" nesses casos.
 */
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

/* =============================================================================
 * Tipos
 * ========================================================================== */

type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  librarianId?: number;
  librarianName?: string | null;
  libraryName?: string | null;
  // Quando reservado, quem reservou e para que criança:
  reservedByName?: string | null;
  reservedChildName?: string | null;
  // ID da consulta associada (quando BOOKED)
  consultationId?: number | null;
};

/* =============================================================================
 * UI: Chip/“Pílula” reutilizável
 * ========================================================================== */

/**
 * Pill — botão compacto para filtros rápidos.
 * Mantém contraste adequado consoante “active”.
 */
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
      accessibilityRole="button"
      accessibilityLabel={label}
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
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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

/* =============================================================================
 * Modal: Criar Slot
 * ========================================================================== */

const DURATION_OPTIONS = [30, 45, 60, 90] as const;

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
          accessibilityViewIsModal
          accessibilityLabel="Criar horário"
        >
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
                {DURATION_OPTIONS.map((m) => (
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
                    accessibilityRole="button"
                    accessibilityLabel={`${m} minutos`}
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

/* =============================================================================
 * Página: Agenda do Bibliotecário
 * ========================================================================== */

type RangeKey = "today" | "tomorrow" | "next3" | "next7" | "all";

export default function AgendaPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  // busy ao abrir consulta por slot (quando não há consultationId no payload)
  const [openingSlotId, setOpeningSlotId] = React.useState<number | null>(null);

  const [range, setRange] = React.useState<RangeKey>("today");

  const { fromIso, toIso } = React.useMemo(() => {
    const now = new Date();

    if (range === "today") {
      return {
        fromIso: now.toISOString(),
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
        reservedByName: s.reservedByName ?? null,
        reservedChildName: s.reservedChildName ?? null,
        consultationId:
          s.consultationId != null
            ? Number(s.consultationId)
            : s.consultation?.id != null
            ? Number(s.consultation.id)
            : null,
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

  const [showCreate, setShowCreate] = React.useState(false);

  const createSlot = React.useCallback(
    async (start: Date, durationMinutes: number) => {
      if (!user?.id) return;
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      try {
        const r = await fetch(`${API_URL}/consultations/slots`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            librarianId: Number(user.id),
          }),
        });

        if (!r.ok) {
          throw new Error((await r.text()) || "Falha ao criar horário");
        }

        setShowCreate(false);
        await load();
      } catch (e: any) {
        Alert.alert("Erro", e?.message || "Não foi possível criar o horário.");
      }
    },
    [user?.id, load]
  );

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

  /** Descobrir consulta por slot (fallback quando não veio consultationId). */
  const findConsultationIdForSlot = React.useCallback(
    async (slotId: number): Promise<number | null> => {
      const tryPaths = [
        `/consultations/slots/${slotId}`, // comum
        `/consultations/by-slot/${slotId}`, // alternativa frequente
        `/consultations?slotId=${slotId}`, // listagem com filtro
      ];
      for (const path of tryPaths) {
        try {
          const res = await fetch(`${API_URL}${path}`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) continue;
          const json = await res.json();
          const id =
            json?.id ??
            json?.consultation?.id ??
            (Array.isArray(json?.items) && json.items[0]?.id) ??
            (Array.isArray(json) && json[0]?.id);
          if (id) return Number(id);
        } catch {
          /* tenta o próximo */
        }
      }
      return null;
    },
    []
  );

  /** Abre modal da consulta associada ao slot BOOKED (com ou sem id à partida). */
  const openConsultationForSlot = React.useCallback(
    async (slot: Slot) => {
      if (!slot) return;
      try {
        setOpeningSlotId(slot.id);
        const id =
          slot.consultationId ?? (await findConsultationIdForSlot(slot.id));
        if (id) {
          router.push(`/librarian/consultas/${id}`);
        } else {
          Alert.alert(
            "Sem consulta associada",
            "Não foi possível localizar a consulta deste horário."
          );
        }
      } finally {
        setOpeningSlotId(null);
      }
    },
    [router, findConsultationIdForSlot]
  );

  /**
   * StatusPill — etiqueta colorida para o estado do slot.
   * Simples e legível (cores suaves com bom contraste).
   */
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

  /* ============================== Render ============================== */

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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

        {/* Filtros */}
        <FlexibleCard
          title="Filtros"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
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
        </FlexibleCard>

        {/* Lista de slots */}
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

                // BOOKED -> cartão clicável e mostra botão "Começar"
                const clickable = s.status === "BOOKED";
                const isOpening = openingSlotId === s.id;

                const Wrapper = ({ children }: { children: React.ReactNode }) =>
                  clickable ? (
                    <TouchableOpacity
                      onPress={() => openConsultationForSlot(s)}
                      accessibilityRole="button"
                      accessibilityLabel="Abrir consulta (Começar)"
                      activeOpacity={0.9}
                    >
                      {children}
                    </TouchableOpacity>
                  ) : (
                    <View>{children}</View>
                  );

                return (
                  <Wrapper key={s.id}>
                    <View
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        backgroundColor: theme.colors.surface,
                        overflow: "hidden",
                        opacity: isOpening ? 0.6 : 1,
                      }}
                    >
                      <View style={{ padding: 12, gap: 6 }}>
                        {/* Linha: intervalo + estado */}
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
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {isOpening && <ActivityIndicator size="small" />}
                            <StatusPill status={s.status} />
                          </View>
                        </View>

                        {/* Biblioteca / Bibliotecário */}
                        {!!(s.libraryName || s.librarianName) && (
                          <Text style={{ color: theme.colors.onSurfaceVariant }}>
                            {[s.librarianName, s.libraryName]
                              .filter(Boolean)
                              .join(" • ")}
                          </Text>
                        )}

                        {/* Se reservado, mostra quem reservou (e criança) */}
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

                        {/* Ações */}
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            marginTop: 6,
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* Botões de bloqueio/desbloqueio (quando aplicável) */}
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

                          {/* NOVO: “Começar” visível quando BOOKED */}
                          {s.status === "BOOKED" && (
                            <View style={{ marginLeft: "auto" }}>
                              <PrimaryButton
                                label="Começar"
                                onPress={() => openConsultationForSlot(s)}
                                disabled={isOpening}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Wrapper>
                );
              })}
            </View>
          )}
        </FlexibleCard>
      </ScrollView>

      {/* Modal de criação de horário */}
      <CreateSlotModal
        visible={showCreate}
        onCancel={() => setShowCreate(false)}
        onConfirm={createSlot}
      />
    </Background>
  );
}

/* =============================================================================
 * Estilos locais
 * ========================================================================== */

const styles = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
});
