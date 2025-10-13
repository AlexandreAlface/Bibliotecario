/**
 * ============================================================================
 * Ficheiro: <mantém o caminho se fornecido>
 * Módulo: Criação em massa de horários (consultas) para bibliotecários
 * Autor:  Alexandre Brissos – Nº 21131
 * ----------------------------------------------------------------------------
 * Reforços:
 * • Comentários (PT-PT) e JSDoc completos.
 * • Helpers PUROS e reutilizáveis.
 * • Funções ≤ 30 linhas, coesas e testáveis.
 * • Tipagem explícita e tratamento de erros “fail-safe”.
 * ============================================================================
 */

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
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

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
} from "src/services/librarian/consultations";
import DateTimePicker from "@react-native-community/datetimepicker";

/* ==========================================================================
 * Constantes e Tipos
 * ========================================================================== */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const CHUNK_SIZE = 150 as const; // nº de registos por lote ao fazer bulk insert
const WEEKDAY_LABELS: ReadonlyArray<string> = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

/* ==========================================================================
 * Helpers PUROS (sem efeitos)
 * ========================================================================== */

/**
 * Devolve uma nova data no início do dia (00:00:00.000).
 */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Soma dias a uma data e devolve uma nova instância.
 */
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Zero à esquerda para números < 10. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formata a data para pt-PT (ex.: 1/1/2025). */
function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(d);
}

/** Formata horas e minutos em HH:mm. */
function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Cria uma nova data com a hora/minuto desejados mantendo o dia fornecido.
 */
function clampToDay(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Itera dias inteiros entre dois limites (inclusive).
 */
function* iterateDays(from: Date, to: Date): Generator<Date> {
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    yield new Date(cur);
    cur = addDays(cur, 1);
  }
}

/** Converte hora/minuto para minutos desde as 00:00. */
function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Calcula a quantidade de slots que serão criados com as opções fornecidas.
 * Útil para pré-visualização.
 */
function countPreviewSlots(params: {
  fromDate: Date;
  toDate: Date;
  weekdays: ReadonlySet<Weekday>;
  startTime: Date;
  endTime: Date;
  duration: number;
  gap: number;
}): number {
  const { fromDate, toDate, weekdays, startTime, endTime, duration, gap } =
    params;

  if (fromDate > toDate) return 0;
  const ds = toMinutes(startTime);
  const de = toMinutes(endTime);
  const stepMin = duration + gap;
  if (stepMin <= 0 || de <= ds + duration) return 0;

  let total = 0;
  for (const day of iterateDays(fromDate, toDate)) {
    if (!weekdays.has(day.getDay() as Weekday)) continue;
    for (let m = ds; m + duration <= de; m += stepMin) total++;
  }
  return total;
}

/**
 * Gera os slots a criar (sem efeitos). Mantém a mesma lógica da página.
 */
function generateSlots(params: {
  fromDate: Date;
  toDate: Date;
  weekdays: ReadonlySet<Weekday>;
  startTime: Date;
  endTime: Date;
  duration: number;
  gap: number;
}): SlotCreateInput[] {
  const { fromDate, toDate, weekdays, startTime, endTime, duration, gap } =
    params;
  const ds = toMinutes(startTime);
  const de = toMinutes(endTime);
  const stepMin = duration + gap;
  const slots: SlotCreateInput[] = [];

  for (const day of iterateDays(fromDate, toDate)) {
    if (!weekdays.has(day.getDay() as Weekday)) continue;
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
  return slots;
}

/**
 * Tenta criar os slots em massa com fallback para criação individual.
 * Devolve contagem de sucesso/erro.
 */
async function saveSlots(
  librarianId: number,
  slots: SlotCreateInput[]
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < slots.length; i += CHUNK_SIZE) {
    const part = slots.slice(i, i + CHUNK_SIZE);
    try {
      await bulkCreateSlots(librarianId, part);
      ok += part.length;
    } catch {
      // Fallback: tenta criar 1 a 1
      for (const s of part) {
        try {
          await createSlot({ ...s, librarianId });
          ok++;
        } catch {
          fail++;
        }
      }
    }
  }
  return { ok, fail };
}

/* ==========================================================================
 * Estilos
 * ========================================================================== */
const styles = StyleSheet.create({
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
});

/* ==========================================================================
 * Componentes menores
 * ========================================================================== */

/**
 * "Pílula" clicável para seleção (ex.: dia da semana).
 */
function Pill({
  label,
  active,
  onPress,
}: {
  /** Texto apresentado dentro da pílula. */
  label: string;
  /** Estado visual de seleção. */
  active: boolean;
  /** Handler ao tocar. */
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        ...styles.pill,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: active
          ? theme.colors.primary
          : theme.colors.secondaryContainer,
        borderColor: theme.colors.outlineVariant,
        borderWidth: active ? 0 : StyleSheet.hairlineWidth,
      }}
    >
      <Icon
        name={active ? "check-circle-outline" : "checkbox-blank-circle-outline"}
        size={14}
        color={
          active ? theme.colors.onPrimary : theme.colors.onSecondaryContainer
        }
      />
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

/**
 * Modal genérico para seleção de data/hora.
 */
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
  /** Controla a visibilidade do modal. */
  visible: boolean;
  /** Título apresentado no cabeçalho do modal. */
  title: string;
  /** Modo do selector (data/hora). */
  mode: "date" | "time";
  /** Valor inicial/selecionado. */
  value: Date;
  /** Data mínima (apenas em modo "date"). */
  minimumDate?: Date;
  /** Data máxima (apenas em modo "date"). */
  maximumDate?: Date;
  /** Cancela/fecha o modal. */
  onCancel: () => void;
  /** Confirma a seleção devolvendo a data/hora. */
  onConfirm: (date: Date) => void;
}) {
  const theme = useTheme();
  const [temp, setTemp] = React.useState<Date>(value);

  // Sempre que abrir o modal, sincroniza o valor temporário
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
          onPress={() => {
            /* captura para evitar fechar ao tocar no conteúdo */
          }}
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
              name={mode === "date" ? "calendar-range" : "clock-outline"}
              size={18}
              color={theme.colors.onSurface}
            />
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

/* ==========================================================================
 * Página
 * ========================================================================== */

/**
 * Página para criação de horários (slots) num intervalo de dias/horas.
 * Mantém todo o comportamento original e adiciona validações e documentação.
 */
export default function SlotsPage() {
  const theme = useTheme();
  const { user } = useAuth();

  // Estado base
  const [fromDate, setFromDate] = React.useState<Date>(startOfDay(new Date()));
  const [toDate, setToDate] = React.useState<Date>(
    addDays(startOfDay(new Date()), 7)
  );

  const [weekdays, setWeekdays] = React.useState<Set<Weekday>>(
    new Set<Weekday>([1, 2, 3, 4, 5])
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

  // Controlo de modais
  const [showFromModal, setShowFromModal] = React.useState(false);
  const [showToModal, setShowToModal] = React.useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = React.useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = React.useState(false);

  /** Alterna a seleção de um dia da semana. */
  const toggleWeekday = (d: Weekday) =>
    setWeekdays((prev) => {
      const n = new Set(prev);
      n.has(d) ? n.delete(d) : n.add(d);
      return n;
    });

  /** Pré-cálculo do nº de slots (texto de pré-visualização). */
  const previewCount = React.useMemo(
    () =>
      countPreviewSlots({
        fromDate,
        toDate,
        weekdays,
        startTime,
        endTime,
        duration,
        gap,
      }),
    [fromDate, toDate, startTime, endTime, duration, gap, weekdays]
  );

  // Estado de submissão
  const [creating, setCreating] = React.useState(false);

  /**
   * Cria todos os slots de acordo com as opções selecionadas.
   * Inclui validações simples e feedback ao utilizador.
   */
  const createAll = React.useCallback(async () => {
    const librarianId = Number(user?.id);

    if (!librarianId) {
      Alert.alert(
        "Sessão inválida",
        "Por favor, termina sessão e volta a entrar."
      );
      return;
    }
    if (previewCount === 0) {
      Alert.alert(
        "Sem horários a criar",
        "Ajusta as opções para gerar horários."
      );
      return;
    }

    const slots = generateSlots({
      fromDate,
      toDate,
      weekdays,
      startTime,
      endTime,
      duration,
      gap,
    });

    setCreating(true);
    try {
      const { ok, fail } = await saveSlots(librarianId, slots);
      Alert.alert(
        "Concluído",
        fail === 0
          ? `Criados ${ok} horário(s) com sucesso.`
          : `Criados ${ok} horário(s). Falharam ${fail}.`
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

  return (
    <Background>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* ===== Header (ícone + título) ===== */}
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
                  name="timetable"
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
                Criar horários
              </Text>
            </View>
          </FlexibleCard>

          {/* ===== Intervalo de datas ===== */}
          <FlexibleCard
            title="Intervalo de datas"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* FROM */}
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon
                    name="calendar-start"
                    size={18}
                    color={theme.colors.onSurface}
                  />
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

              {/* TO */}
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon
                    name="calendar-end"
                    size={18}
                    color={theme.colors.onSurface}
                  />
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

            {/* Modal: FROM */}
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

            {/* Modal: TO */}
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

            {/* Dias da semana */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Icon
                name="calendar-week"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Dias da semana
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {WEEKDAY_LABELS.map((lab, idx) => (
                <Pill
                  key={idx}
                  label={lab}
                  active={weekdays.has(idx as Weekday)}
                  onPress={() => toggleWeekday(idx as Weekday)}
                />
              ))}
            </View>
          </FlexibleCard>

          {/* ===== Janela e duração ===== */}
          <FlexibleCard
            title="Janela diária e duração"
            backgroundColor={theme.colors.surface}
            elevation={1}
            padding={14}
            style={{ borderRadius: 12 }}
          >
            {/* Hora de início e fim */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Icon
                name="clock-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Hora de início e fim
              </Text>
            </View>
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon
                    name="clock-outline"
                    size={18}
                    color={theme.colors.onSurface}
                  />
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon
                    name="clock-outline"
                    size={18}
                    color={theme.colors.onSurface}
                  />
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

            {/* Modal: hora início */}
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

            {/* Modal: hora fim */}
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

            {/* Duração */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Icon
                name="timer-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Duração do slot
              </Text>
            </View>
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon
                    name={duration === m ? "check" : "timer-sand"}
                    size={14}
                    color={
                      duration === m
                        ? theme.colors.onPrimary
                        : theme.colors.onSurface
                    }
                  />
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

            {/* Intervalo entre slots */}
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              <Text>
                <Icon
                  name="progress-clock"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />{" "}
              </Text>
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
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon
                    name={gap === m ? "check" : "clock-outline"}
                    size={14}
                    color={
                      gap === m
                        ? theme.colors.onPrimary
                        : theme.colors.onSurface
                    }
                  />
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

            {/* Pré-visualização */}
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
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="eye-outline"
                  size={18}
                  color={theme.colors.onSurface}
                />
                <Text style={{ color: theme.colors.onSurface }}>
                  Pré-visualização:{" "}
                  <Text style={{ fontWeight: "800" }}>{previewCount}</Text>{" "}
                  horário(s) a criar
                </Text>
              </View>
              <Text
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                {fmtDate(fromDate)} → {fmtDate(toDate)} •{" "}
                {Array.from(weekdays)
                  .sort()
                  .map((d) => WEEKDAY_LABELS[d as number])
                  .join(", ")}{" "}
                • {fmtTime(startTime)}–{fmtTime(endTime)} • {duration} min{" "}
                {gap ? `(+ ${gap} min)` : ""}
              </Text>
            </View>

            {/* Ações */}
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
                  setWeekdays(new Set<Weekday>([1, 2, 3, 4, 5]));
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
    </Background>
  );
}
