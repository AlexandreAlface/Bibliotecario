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
import { useTheme, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";

import Background from "@bibliotecario/ui-mobile/components/Background/Background";
import FlexibleCard from "@bibliotecario/ui-mobile/components/Card/FlexibleCard";
import {
  PrimaryButton,
  SecondaryButton,
} from "@bibliotecario/ui-mobile/components/Buttons/Buttons";

import { useAuth } from "src/contexts/AuthContext";
import {
  listLibrarianSlots,
  bulkCreateSlots,
  createSlot,
  type SlotCreateInput,
} from "src/services/librarian/consultations";
import { API_URL } from "src/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";

/* ==========================================================================
 * Constantes e Tipos
 * ========================================================================== */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Mode = "DAY" | "WEEK" | "MONTH" | "RANGE";

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

/** "HH:mm" a partir de um Date (ignora o dia). */
function toHM(d: Date): string {
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
 * Útil para pré-visualização simples (modo básico).
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
 * Gera os slots a criar (sem efeitos). Mantém a mesma lógica da página (básica).
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

/* ==================== Helpers puros — opções avançadas ==================== */

type Interval = { startAt: Date; endAt: Date };
type HMWindow = { start: string; end: string };

/** Converte "HH:mm" em horas/minutos numéricos. */
function parseHM(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return { h, m };
}
/** Overlap simples entre intervalos. */
function overlapsI(a: Interval, b: Interval) {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}
/** Filtra candidatos que colidem com ocupação existente. */
function filterNonOverlapping(candidates: Interval[], busy: Interval[]) {
  if (!busy.length) return candidates;
  return candidates.filter((c) => !busy.some((b) => overlapsI(c, b)));
}
/** Chave estável por dia (sem tempo). */
function sameDayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}
/** Mapa “dia → intervalos existentes”. */
function existingByDay(existing: Array<{ startAt: string; endAt: string }>) {
  const map = new Map<string, Interval[]>();
  for (const s of existing || []) {
    const key = sameDayKey(new Date(s.startAt));
    const arr = map.get(key) || [];
    arr.push({ startAt: new Date(s.startAt), endAt: new Date(s.endAt) });
    map.set(key, arr);
  }
  return map;
}
/** Datas a excluir (CSV ou espaços) no formato YYYY-MM-DD. */
function parseSkipDates(csv: string) {
  const set = new Set<string>();
  for (const raw of csv.split(/[,\s]+/)) {
    const s = raw.trim();
    if (!s) continue;
    const d = new Date(s + "T00:00:00");
    if (!isNaN(+d)) set.add(d.toISOString().slice(0, 10));
  }
  return set;
}
/** Intervalos para um dia, a partir de "janelas" (ex.: manhã/tarde). */
function generateIntervalsForDay(
  day: Date,
  hhmmStart: string,
  hhmmEnd: string,
  slotMinutes: number,
  gapMinutes: number
): Interval[] {
  const { h: hStart, m: mStart } = parseHM(hhmmStart);
  const { h: hEnd, m: mEnd } = parseHM(hhmmEnd);
  if (slotMinutes <= 0) return [];
  const totalMin = hEnd * 60 + mEnd - (hStart * 60 + mStart);
  if (totalMin <= 0) return [];
  const out: Interval[] = [];
  let cur = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hStart,
    mStart,
    0,
    0
  );
  const endD = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hEnd,
    mEnd,
    0,
    0
  );
  while (cur < endD) {
    const st = new Date(cur);
    const en = new Date(cur.getTime() + slotMinutes * 60000);
    if (en > endD) break;
    out.push({ startAt: st, endAt: en });
    cur = new Date(en.getTime() + gapMinutes * 60000);
  }
  return out;
}
/** Janelas múltiplas → intervalos ordenados. */
function intervalsForWindows(
  day: Date,
  windows: HMWindow[],
  slotMinutes: number,
  gapMinutes: number
): Interval[] {
  const out: Interval[] = [];
  for (const w of windows) {
    out.push(
      ...generateIntervalsForDay(day, w.start, w.end, slotMinutes, gapMinutes)
    );
  }
  return out.sort((a, b) => +a.startAt - +b.startAt);
}
/** Intervalo [from,to] derivado do modo escolhido (Dia/Semana/Mês/Intervalo). */
function rangeFromMode(
  mode: Mode,
  base: Date,
  baseTo: Date
): { from: Date; to: Date } {
  const d = startOfDay(base);
  if (mode === "DAY") return { from: startOfDay(d), to: startOfDay(d) };
  if (mode === "WEEK") {
    const dow = (d.getDay() + 6) % 7; // 0=Seg..6=Dom
    const monday = addDays(d, -dow);
    const sunday = addDays(monday, 6);
    return { from: startOfDay(monday), to: startOfDay(sunday) };
  }
  if (mode === "MONTH") {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: startOfDay(first), to: startOfDay(last) };
  }
  const a = startOfDay(base);
  const b = startOfDay(baseTo);
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  return { from: startOfDay(lo), to: startOfDay(hi) };
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
 * "Pílula" clicável para seleção (ex.: dia da semana ou toggles simples).
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
 * Esta versão replica as opções da página web: modo (Dia/Semana/Mês/Intervalo),
 * janelas (manhã/tarde), duração/intervalo, regras avançadas e biblioteca.
 */
export default function SlotsPage() {
  const theme = useTheme();
  const { user } = useAuth();

  /* =================== PASSO 1 — Intervalo (modo + datas) =================== */
  const [mode, setMode] = React.useState<Mode>("WEEK");
  const [baseDate, setBaseDate] = React.useState<Date>(startOfDay(new Date()));
  const [baseDateTo, setBaseDateTo] = React.useState<Date>(
    startOfDay(new Date())
  );
  const { from: fromDate, to: toDate } = React.useMemo(
    () => rangeFromMode(mode, baseDate, baseDateTo),
    [mode, baseDate, baseDateTo]
  );

  // Dias da semana (alinha com getDay(): 0=Dom..6=Sáb) — por omissão seg-sex
  const [weekdays, setWeekdays] = React.useState<Set<Weekday>>(
    new Set<Weekday>([1, 2, 3, 4, 5])
  );

  /* ========== PASSO 2 — Janelas do dia (manhã/tarde) e granularidade ========== */
  const [useMorning, setUseMorning] = React.useState(true);
  const [morningStart, setMorningStart] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [morningEnd, setMorningEnd] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 30, 0, 0);
    return d;
  });

  const [useAfternoon, setUseAfternoon] = React.useState(false);
  const [afternoonStart, setAfternoonStart] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d;
  });
  const [afternoonEnd, setAfternoonEnd] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });

  const [duration, setDuration] = React.useState<number>(30);
  const [gap, setGap] = React.useState<number>(0);

  // Controlo de modais
  const [showBaseDateModal, setShowBaseDateModal] = React.useState(false);
  const [showBaseDateToModal, setShowBaseDateToModal] = React.useState(false);
  const [showMorningStartModal, setShowMorningStartModal] =
    React.useState(false);
  const [showMorningEndModal, setShowMorningEndModal] = React.useState(false);
  const [showAfternoonStartModal, setShowAfternoonStartModal] =
    React.useState(false);
  const [showAfternoonEndModal, setShowAfternoonEndModal] =
    React.useState(false);

  /** Alterna a seleção de um dia da semana. */
  const toggleWeekday = (d: Weekday) =>
    setWeekdays((prev) => {
      const n = new Set(prev);
      n.has(d) ? n.delete(d) : n.add(d);
      return n;
    });

  /* =================== PASSO 3 — Bibliotecas do bibliotecário =================== */
  const [libs, setLibs] = React.useState<Array<{ id: number; name: string }>>(
    []
  );
  const [libraryId, setLibraryId] = React.useState<number | "">("");
  React.useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(
          `${API_URL}/consultations/librarians/${user.id}/libraries`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
          }
        );
        const arr = await r.json().catch(() => []);
        const clean = (Array.isArray(arr) ? arr : []).map((x: any) => ({
          id: Number(x?.id),
          name: String(x?.name ?? ""),
        }));
        setLibs(clean);
        if (clean.length === 1) setLibraryId(clean[0].id);
      } catch {
        setLibs([]);
        setLibraryId("");
      }
    })();
  }, [user?.id]);

  /* =================== Ocupações existentes (para preencher lacunas) =================== */
  const [existing, setExisting] = React.useState<
    Array<{ startAt: string; endAt: string }>
  >([]);
  const [loadingExisting, setLoadingExisting] = React.useState(false);
  React.useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoadingExisting(true);
      try {
        const items = await listLibrarianSlots(Number(user.id), {
          from: fromDate.toISOString(),
          to: addDays(toDate, 1).toISOString(), // incluir fim do dia
        });
        setExisting(Array.isArray(items) ? items : []);
      } catch {
        setExisting([]);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [user?.id, fromDate.getTime(), toDate.getTime()]);

  /* =================== Regras avançadas (como na web) =================== */
  const [fillGapsOnBusyDays, setFillGapsOnBusyDays] = React.useState(false);
  const [maxPerDay, setMaxPerDay] = React.useState<string>(""); // string para permitir vazio
  const [skipDatesCsv, setSkipDatesCsv] = React.useState<string>("");

  /* =================== Pré-visualização (intervalos candidatos) =================== */
  const preview = React.useMemo<Interval[]>(() => {
    const windows: HMWindow[] = [];
    if (useMorning)
      windows.push({ start: toHM(morningStart), end: toHM(morningEnd) });
    if (useAfternoon)
      windows.push({ start: toHM(afternoonStart), end: toHM(afternoonEnd) });
    if (!windows.length || duration <= 0) return [];

    const out: Interval[] = [];
    const busyMap = existingByDay(existing);
    const skipSet = parseSkipDates(skipDatesCsv);
    const maxPer =
      maxPerDay === "" ? undefined : Math.max(0, Number(maxPerDay));

    for (const day of iterateDays(fromDate, toDate)) {
      if (!weekdays.has(day.getDay() as Weekday)) continue;
      if (skipSet.has(day.toISOString().slice(0, 10))) continue;

      const dayKey = sameDayKey(day);
      const busy = busyMap.get(dayKey) || [];

      let candidates = intervalsForWindows(day, windows, duration, gap);
      if (fillGapsOnBusyDays) {
        candidates = filterNonOverlapping(candidates, busy);
      } else if (busy.length) {
        candidates = [];
      }
      if (typeof maxPer === "number") {
        candidates = candidates.slice(0, maxPer);
      }
      out.push(...candidates);
    }
    return out;
  }, [
    fromDate,
    toDate,
    weekdays,
    useMorning,
    morningStart,
    morningEnd,
    useAfternoon,
    afternoonStart,
    afternoonEnd,
    duration,
    gap,
    existing,
    fillGapsOnBusyDays,
    maxPerDay,
    skipDatesCsv,
  ]);
  const previewCount = preview.length;

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

    // Payload resultante do preview (já sem colisões e respeitando regras)
    const slots: SlotCreateInput[] = preview.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      status: "OPEN",
      ...(libraryId !== "" ? { libraryId: Number(libraryId) } : {}),
    }));

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
  }, [user?.id, preview, previewCount, libraryId]);

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
          <View style={{ gap: 8 }}>
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
                  accessibilityLabel="Ícone de horários"
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "900",
                  color: theme.colors.onSurface,
                }}
                accessibilityRole="header"
              >
                Criar horários
              </Text>
            </View>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                lineHeight: 18,
              }}
              numberOfLines={4}
            >
              Replicação da versão web: escolhe o modo
              (dia/semana/mês/intervalo), as janelas (manhã/tarde), duração e
              intervalo, regras avançadas e, se aplicável, a biblioteca. A
              pré-visualização respeita slots já existentes.
            </Text>
          </View>
        </FlexibleCard>

        {/* ===== 1) Intervalo ===== */}
        <FlexibleCard
          title="1) Intervalo"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          {/* Modo */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {(["DAY", "WEEK", "MONTH", "RANGE"] as Mode[]).map((m) => (
              <Pill
                key={m}
                label={
                  {
                    DAY: "Dia",
                    WEEK: "Semana",
                    MONTH: "Mês",
                    RANGE: "Intervalo",
                  }[m]
                }
                active={mode === m}
                onPress={() => setMode(m)}
              />
            ))}
          </View>

          {/* Datas base (um ou dois controlos consoante o modo) */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowBaseDateToModal(false);
                  setShowBaseDateModal(true);
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
                  {mode === "DAY"
                    ? "Dia"
                    : mode === "WEEK"
                    ? "Qualq. dia da semana"
                    : mode === "MONTH"
                    ? "Mês"
                    : "De"}{" "}
                  · {fmtDate(baseDate)}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {fmtDate(baseDate)}
              </Text>
            </View>

            {mode === "RANGE" && (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowBaseDateModal(false);
                    setShowBaseDateToModal(true);
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
                    Até · {fmtDate(baseDateTo)}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {fmtDate(baseDateTo)}
                </Text>
              </View>
            )}
          </View>

          {/* Modais de datas */}
          <PickerModal
            visible={showBaseDateModal}
            title={
              mode === "MONTH"
                ? "Selecionar mês (qualquer dia)"
                : "Selecionar data"
            }
            mode="date"
            value={baseDate}
            minimumDate={startOfDay(new Date())}
            onCancel={() => setShowBaseDateModal(false)}
            onConfirm={(d) => {
              setBaseDate(startOfDay(d));
              setShowBaseDateModal(false);
            }}
          />
          <PickerModal
            visible={showBaseDateToModal}
            title="Selecionar data final"
            mode="date"
            value={baseDateTo}
            minimumDate={baseDate}
            onCancel={() => setShowBaseDateToModal(false)}
            onConfirm={(d) => {
              setBaseDateTo(startOfDay(d));
              setShowBaseDateToModal(false);
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

        {/* ===== 2) Janelas do dia e duração ===== */}
        <FlexibleCard
          title="2) Janelas do dia e duração"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          {/* Manhã */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Pill
              label={useMorning ? "Usar manhã ✓" : "Usar manhã"}
              active={useMorning}
              onPress={() => setUseMorning((v) => !v)}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              opacity: useMorning ? 1 : 0.5,
            }}
          >
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setShowMorningStartModal(true)}
                disabled={!useMorning}
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
                  {fmtTime(morningStart)}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setShowMorningEndModal(true)}
                disabled={!useMorning}
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
                  {fmtTime(morningEnd)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tarde */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              marginBottom: 6,
            }}
          >
            <Pill
              label={useAfternoon ? "Usar tarde ✓" : "Usar tarde"}
              active={useAfternoon}
              onPress={() => setUseAfternoon((v) => !v)}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              opacity: useAfternoon ? 1 : 0.5,
            }}
          >
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setShowAfternoonStartModal(true)}
                disabled={!useAfternoon}
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
                  {fmtTime(afternoonStart)}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => setShowAfternoonEndModal(true)}
                disabled={!useAfternoon}
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
                  {fmtTime(afternoonEnd)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modais horas */}
          <PickerModal
            visible={showMorningStartModal}
            title="Manhã — início"
            mode="time"
            value={morningStart}
            onCancel={() => setShowMorningStartModal(false)}
            onConfirm={(t) => {
              const v = new Date(t);
              v.setSeconds(0, 0);
              if (v >= morningEnd)
                setMorningEnd(new Date(v.getTime() + duration * 60000));
              setMorningStart(v);
              setShowMorningStartModal(false);
            }}
          />
          <PickerModal
            visible={showMorningEndModal}
            title="Manhã — fim"
            mode="time"
            value={morningEnd}
            onCancel={() => setShowMorningEndModal(false)}
            onConfirm={(t) => {
              const v = new Date(t);
              v.setSeconds(0, 0);
              if (v <= morningStart)
                setMorningEnd(
                  new Date(morningStart.getTime() + duration * 60000)
                );
              else setMorningEnd(v);
              setShowMorningEndModal(false);
            }}
          />
          <PickerModal
            visible={showAfternoonStartModal}
            title="Tarde — início"
            mode="time"
            value={afternoonStart}
            onCancel={() => setShowAfternoonStartModal(false)}
            onConfirm={(t) => {
              const v = new Date(t);
              v.setSeconds(0, 0);
              if (v >= afternoonEnd)
                setAfternoonEnd(new Date(v.getTime() + duration * 60000));
              setAfternoonStart(v);
              setShowAfternoonStartModal(false);
            }}
          />
          <PickerModal
            visible={showAfternoonEndModal}
            title="Tarde — fim"
            mode="time"
            value={afternoonEnd}
            onCancel={() => setShowAfternoonEndModal(false)}
            onConfirm={(t) => {
              const v = new Date(t);
              v.setSeconds(0, 0);
              if (v <= afternoonStart)
                setAfternoonEnd(
                  new Date(afternoonStart.getTime() + duration * 60000)
                );
              else setAfternoonEnd(v);
              setShowAfternoonEndModal(false);
            }}
          />

          {/* Divider */}
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
                    gap === m ? theme.colors.onPrimary : theme.colors.onSurface
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
        </FlexibleCard>

        {/* ===== Regras avançadas ===== */}
        <FlexibleCard
          title="Regras avançadas"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          <View style={{ gap: 10 }}>
            <Pill
              label="Preencher lacunas em dias com slots"
              active={fillGapsOnBusyDays}
              onPress={() => setFillGapsOnBusyDays((v) => !v)}
            />
            <View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Máx. slots por dia (opcional)
              </Text>
              <TextInput
                mode="outlined"
                placeholder="ex.: 6"
                value={maxPerDay}
                onChangeText={setMaxPerDay}
                keyboardType="number-pad"
                style={{ backgroundColor: theme.colors.surface }}
              />
            </View>
            <View>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 6,
                }}
              >
                Datas a excluir (CSV de YYYY-MM-DD)
              </Text>
              <TextInput
                mode="outlined"
                placeholder="2025-10-14, 2025-10-21"
                value={skipDatesCsv}
                onChangeText={setSkipDatesCsv}
                autoCapitalize="none"
                style={{ backgroundColor: theme.colors.surface }}
              />
            </View>
          </View>
        </FlexibleCard>

        {/* ===== Biblioteca ===== */}
        <FlexibleCard
          title="3) Biblioteca"
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          {libs.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Sem biblioteca associada — os horários serão criados sem
              biblioteca.
            </Text>
          )}
          {libs.length === 1 && (
            <Text style={{ color: theme.colors.onSurface }}>
              Biblioteca associada:{" "}
              <Text style={{ fontWeight: "800" }}>{libs[0].name}</Text>{" "}
              (aplicada automaticamente)
            </Text>
          )}
          {libs.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {libs.map((l) => (
                <Pill
                  key={l.id}
                  label={l.name}
                  active={libraryId === l.id}
                  onPress={() => setLibraryId(l.id)}
                />
              ))}
              <Pill
                label="Sem biblioteca"
                active={libraryId === ""}
                onPress={() => setLibraryId("")}
              />
            </View>
          )}
        </FlexibleCard>

        {/* ===== 4) Pré-visualização & ações ===== */}
        <FlexibleCard
          title={`4) Pré-visualização ${
            loadingExisting ? "· a carregar existentes…" : ""
          }`}
          backgroundColor={theme.colors.surface}
          elevation={1}
          padding={14}
          style={{ borderRadius: 12 }}
        >
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.onSurface }}>
              Intervalo:{" "}
              <Text style={{ fontWeight: "800" }}>{fmtDate(fromDate)}</Text> —{" "}
              <Text style={{ fontWeight: "800" }}>{fmtDate(toDate)}</Text>
            </Text>
            <Text style={{ color: theme.colors.onSurface }}>
              Dias com slots existentes:{" "}
              <Text style={{ fontWeight: "800" }}>
                {
                  Array.from(
                    new Set(
                      existing.map((s) => sameDayKey(new Date(s.startAt)))
                    )
                  ).length
                }
              </Text>{" "}
              {fillGapsOnBusyDays
                ? "(serão preenchidas as lacunas)"
                : "(serão saltados)"}
            </Text>
            <Text style={{ color: theme.colors.onSurface }}>
              Serão criados{" "}
              <Text style={{ fontWeight: "800" }}>{previewCount}</Text> slots.
            </Text>

            {/* Lista compacta (cap a 20) */}
            <View style={{ paddingTop: 4 }}>
              {preview.slice(0, 20).map((s, idx) => (
                <Text
                  key={idx}
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {fmtDate(s.startAt)} · {fmtTime(s.startAt)}—{fmtTime(s.endAt)}
                </Text>
              ))}
              {preview.length > 20 && (
                <Text
                  style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}
                >
                  (+{preview.length - 20} mais…)
                </Text>
              )}
              {preview.length === 0 && (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Nada para criar. Ajusta os filtros acima.
                </Text>
              )}
            </View>
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
                setMode("WEEK");
                setBaseDate(today);
                setBaseDateTo(today);
                setWeekdays(new Set<Weekday>([1, 2, 3, 4, 5]));
                const st = new Date();
                st.setHours(9, 0, 0, 0);
                const sm = new Date();
                sm.setHours(12, 30, 0, 0);
                const at = new Date();
                at.setHours(14, 0, 0, 0);
                const ae = new Date();
                ae.setHours(17, 0, 0, 0);
                setUseMorning(true);
                setMorningStart(st);
                setMorningEnd(sm);
                setUseAfternoon(false);
                setAfternoonStart(at);
                setAfternoonEnd(ae);
                setDuration(30);
                setGap(0);
                setFillGapsOnBusyDays(false);
                setMaxPerDay("");
                setSkipDatesCsv("");
                setLibraryId(libs.length === 1 ? libs[0].id : "");
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
