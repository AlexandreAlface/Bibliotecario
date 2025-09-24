import * as React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import {
  bulkCreateSlots,
  createSlot,
  type SlotCreateInput,
} from "src/services/librarian/consultations"; // ⬅️ novo serviço

/* ---------------- helpers de data ---------------- */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
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
function clampToDay(date: Date, hour: number, minute: number) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function* iterateDays(from: Date, to: Date) {
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    yield new Date(cur);
    cur = addDays(cur, 1);
  }
}

/* ---------------- estilos ---------------- */
const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
});

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
      style={{
        ...styles.pill,
        backgroundColor: active
          ? theme.colors.primary
          : theme.colors.secondaryContainer,
        borderColor: theme.colors.outlineVariant,
        borderWidth: active ? 0 : StyleSheet.hairlineWidth,
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

/* ---------------- Modal genérico ---------------- */
function PickerModal({
  visible,
  title,
  mode,
  value,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  mode: "date" | "time";
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}) {
  const theme = useTheme();
  const [temp, setTemp] = React.useState<Date>(value);
  React.useEffect(() => {
    if (visible) setTemp(value);
  }, [visible, value]);

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
          <View
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
              {title}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: Platform.OS === "ios" ? 8 : 0,
            }}
          >
            <DateTimePicker
              mode={mode}
              display={
                Platform.OS === "ios"
                  ? "spinner"
                  : mode === "date"
                  ? "calendar"
                  : "spinner"
              }
              value={temp}
              onChange={(_, d) => d && setTemp(d)}
              minimumDate={mode === "date" ? minimumDate : undefined}
              maximumDate={mode === "date" ? maximumDate : undefined}
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

/* ---------------- página ---------------- */
export default function SlotsPage() {
  const theme = useTheme();
  const { user } = useAuth();

  const [fromDate, setFromDate] = React.useState<Date>(startOfDay(new Date()));
  const [toDate, setToDate] = React.useState<Date>(
    addDays(startOfDay(new Date()), 7)
  );

  const [weekdays, setWeekdays] = React.useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  );
  const [startTime, setStartTime] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [duration, setDuration] = React.useState<number>(30);
  const [gap, setGap] = React.useState<number>(0);

  const [showFromModal, setShowFromModal] = React.useState(false);
  const [showToModal, setShowToModal] = React.useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = React.useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = React.useState(false);

  const toggleWeekday = (d: number) =>
    setWeekdays((prev) => {
      const n = new Set(prev);
      n.has(d) ? n.delete(d) : n.add(d);
      return n;
    });

  const previewCount = React.useMemo(() => {
    if (fromDate > toDate) return 0;
    const stepMin = duration + gap;
    if (stepMin <= 0) return 0;

    const ds = startTime.getHours() * 60 + startTime.getMinutes();
    const de = endTime.getHours() * 60 + endTime.getMinutes();
    if (de <= ds + duration) return 0;

    let total = 0;
    for (const day of iterateDays(fromDate, toDate)) {
      if (!weekdays.has(day.getDay())) continue;
      for (let m = ds; m + duration <= de; m += stepMin) total++;
    }
    return total;
  }, [fromDate, toDate, startTime, endTime, duration, gap, weekdays]);

  const [creating, setCreating] = React.useState(false);

  const createAll = React.useCallback(async () => {
    if (!user?.id) {
      Alert.alert("Sessão inválida");
      return;
    }
    if (previewCount === 0) {
      Alert.alert(
        "Sem horários a criar",
        "Ajusta as opções para gerar horários."
      );
      return;
    }

    const ds = startTime.getHours() * 60 + startTime.getMinutes();
    const de = endTime.getHours() * 60 + endTime.getMinutes();
    const stepMin = duration + gap;

    const slots: SlotCreateInput[] = [];
    for (const day of iterateDays(fromDate, toDate)) {
      if (!weekdays.has(day.getDay())) continue;
      for (let m = ds; m + duration <= de; m += stepMin) {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        const start = clampToDay(day, h, mm);
        const end = new Date(start.getTime() + duration * 60 * 1000);
        slots.push({
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: "OPEN",
        });
      }
    }

    setCreating(true);
    let ok = 0;
    let fail = 0;

    try {
      // tenta BULK em chunks
      const CHUNK = 150;
      for (let i = 0; i < slots.length; i += CHUNK) {
        const part = slots.slice(i, i + CHUNK);
        try {
          await bulkCreateSlots(Number(user.id), part);
          ok += part.length;
        } catch (e) {
          // fallback 1-a-1 só para este chunk
          for (const s of part) {
            try {
              await createSlot({ ...s, librarianId: Number(user.id) });
              ok++;
            } catch {
              fail++;
            }
          }
        }
      }

      Alert.alert(
        "Concluído",
        fail === 0
          ? `Criados ${ok} horários com sucesso.`
          : `Criados ${ok} horários. Falharam ${fail}.`
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha a criar horários.");
    } finally {
      setCreating(false);
    }
  }, [
    user?.id,
    fromDate,
    toDate,
    startTime,
    endTime,
    duration,
    gap,
    weekdays,
    previewCount,
  ]);

  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Background>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.colors.onBackground,
            }}
          >
            Criar horários (slots)
          </Text>

          {/* Intervalo de datas */}
          <FlexibleCard
            title="Intervalo de datas"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowToModal(false);
                    setShowFromModal(true);
                  }}
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
                    {fmtDate(fromDate)}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {fmtDate(fromDate)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowFromModal(false);
                    setShowToModal(true);
                  }}
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
                    {fmtDate(toDate)}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {fmtDate(toDate)}
                </Text>
              </View>
            </View>

            <PickerModal
              visible={showFromModal}
              title="Selecionar data inicial"
              mode="date"
              value={fromDate}
              minimumDate={startOfDay(new Date())}
              onCancel={() => setShowFromModal(false)}
              onConfirm={(d) => {
                const v = startOfDay(d);
                setFromDate(v);
                if (v > toDate) setToDate(v);
                setShowFromModal(false);
              }}
            />
            <PickerModal
              visible={showToModal}
              title="Selecionar data final"
              mode="date"
              value={toDate}
              minimumDate={fromDate}
              onCancel={() => setShowToModal(false)}
              onConfirm={(d) => {
                const v = startOfDay(d);
                setToDate(v < fromDate ? fromDate : v);
                setShowToModal(false);
              }}
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Dias da semana
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {weekdayLabels.map((lab, idx) => (
                <Pill
                  key={idx}
                  label={lab}
                  active={weekdays.has(idx)}
                  onPress={() => toggleWeekday(idx)}
                />
              ))}
            </View>
          </FlexibleCard>

          {/* Janela e duração */}
          <FlexibleCard
            title="Janela diária e duração"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Hora de início e fim
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowEndTimeModal(false);
                    setShowStartTimeModal(true);
                  }}
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
                    {fmtTime(startTime)}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {fmtTime(startTime)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartTimeModal(false);
                    setShowEndTimeModal(true);
                  }}
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
                    {fmtTime(endTime)}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {fmtTime(endTime)}
                </Text>
              </View>
            </View>

            <PickerModal
              visible={showStartTimeModal}
              title="Hora de início"
              mode="time"
              value={startTime}
              onCancel={() => setShowStartTimeModal(false)}
              onConfirm={(t) => {
                const v = new Date(t);
                v.setSeconds(0, 0);
                if (v >= endTime) {
                  const adj = new Date(v.getTime() + duration * 60 * 1000);
                  setEndTime(adj);
                }
                setStartTime(v);
                setShowStartTimeModal(false);
              }}
            />
            <PickerModal
              visible={showEndTimeModal}
              title="Hora de fim"
              mode="time"
              value={endTime}
              onCancel={() => setShowEndTimeModal(false)}
              onConfirm={(t) => {
                const v = new Date(t);
                v.setSeconds(0, 0);
                if (v <= startTime) {
                  const adj = new Date(
                    startTime.getTime() + duration * 60 * 1000
                  );
                  setEndTime(adj);
                } else setEndTime(v);
                setShowEndTimeModal(false);
              }}
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.outlineVariant,
                opacity: 0.6,
                marginVertical: 12,
              }}
            />
            <Text
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}
            >
              Duração do slot
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[15, 20, 30, 45, 60].map((m) => (
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

            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              Intervalo entre slots (opcional)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[0, 5, 10, 15].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setGap(m)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor:
                      gap === m ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text
                    style={{
                      color:
                        gap === m
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

            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text style={{ color: theme.colors.onSurface }}>
                Pré-visualização:{" "}
                <Text style={{ fontWeight: "800" }}>{previewCount}</Text>{" "}
                horário(s) a criar
              </Text>
              <Text
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                {fmtDate(fromDate)} → {fmtDate(toDate)} •{" "}
                {Array.from(weekdays)
                  .sort()
                  .map(
                    (d) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d]
                  )
                  .join(", ")}{" "}
                • {fmtTime(startTime)}–{fmtTime(endTime)} • {duration} min{" "}
                {gap ? `(+ ${gap} min)` : ""}
              </Text>
            </View>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
              <PrimaryButton
                label={creating ? "A criar…" : "Criar horários"}
                onPress={createAll}
                disabled={creating || previewCount === 0}
              />
              <SecondaryButton
                label="Limpar"
                onPress={() => {
                  const today = startOfDay(new Date());
                  setFromDate(today);
                  setToDate(addDays(today, 7));
                  setWeekdays(new Set([1, 2, 3, 4, 5]));
                  const st = new Date();
                  st.setHours(9, 0, 0, 0);
                  const et = new Date();
                  et.setHours(18, 0, 0, 0);
                  setStartTime(st);
                  setEndTime(et);
                  setDuration(30);
                  setGap(0);
                }}
              />
            </View>

            {creating && (
              <View style={{ alignItems: "center", marginTop: 10 }}>
                <ActivityIndicator />
              </View>
            )}
          </FlexibleCard>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}
