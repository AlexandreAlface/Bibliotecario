// packages/ui-mobile/src/components/DateTimeField/DateTimeField.tsx
import * as React from "react";
import {
  Platform,
  StyleSheet,
  View,
  ViewStyle,
  ScrollView,
} from "react-native";
import {
  Text,
  TextInput,
  useTheme,
  Portal,
  Dialog,
  Button,
  Chip,
  Surface,
} from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

import { MaterialCommunityIcons as MIcon } from "@expo/vector-icons";

/** slot tipo agenda */
export type TimeSlot = { time: string; label?: string; disabled?: boolean };

export type DateTimeFieldProps = {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;

  /** Hora obrigatória: abre sempre após escolher a data */
  withTime?: boolean;
  /** Hora opcional: abre, mas se cancelar fica só a data */
  withOptionalTime?: boolean;

  /** Se passares, mostra grelha de horários em vez do TimePicker */
  timeSlots?: TimeSlot[];
  /** iOS: usar picker nativo (sem slots) */
  iosNativeTimePicker?: boolean;

  minimumDate?: Date;
  maximumDate?: Date;

  error?: boolean;
  helperText?: string;

  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  use24Hour?: boolean;
  locale?: string;
  readOnly?: boolean;
  disabled?: boolean;
};

export function DateTimeField({
  label,
  value,
  onChange,
  withTime = false,
  withOptionalTime = false,
  timeSlots,
  iosNativeTimePicker = false,
  minimumDate,
  maximumDate,
  error,
  helperText,
  fullWidth = true,
  style,
  use24Hour = true,
  locale = "pt",
  readOnly = true,
  disabled,
}: DateTimeFieldProps) {
  const theme = useTheme();

  const [openDate, setOpenDate] = React.useState(false);
  const [openTime, setOpenTime] = React.useState(false);
  const [openNativeTime, setOpenNativeTime] = React.useState(false);
  const [openSlots, setOpenSlots] = React.useState(false);

  /** guarda a data escolhida até o utilizador confirmar a hora */
  const [pendingDate, setPendingDate] = React.useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);

  const timeChosen =
    !!value && (value.getHours() !== 0 || value.getMinutes() !== 0);

  const display = React.useMemo(() => {
    if (!value) return "";
    const date = value.toLocaleDateString(locale);
    const mustShowTime =
      withTime ||
      (withOptionalTime && timeChosen) ||
      (!!timeSlots && timeChosen);
    if (!mustShowTime) return date;
    const time = value.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !use24Hour,
    });
    return `${date} ${time}`;
  }, [
    value,
    withTime,
    withOptionalTime,
    timeSlots,
    timeChosen,
    use24Hour,
    locale,
  ]);

  function onConfirmDate({ date }: { date: Date }) {
    setOpenDate(false);
    const onlyDate = startOfDay(date);
    setPendingDate(onlyDate);

    // 1) slots → abre grelha
    if (timeSlots && (withTime || withOptionalTime)) {
      setSelectedSlot(null);
      setTimeout(() => setOpenSlots(true), 30);
      return;
    }

    // 2) iOS: picker nativo (sem slots)
    if (
      (withTime || withOptionalTime) &&
      iosNativeTimePicker &&
      Platform.OS === "ios"
    ) {
      setTimeout(() => setOpenNativeTime(true), 30);
      return;
    }

    // 3) modal do Paper
    if (withTime || withOptionalTime) {
      setTimeout(() => setOpenTime(true), 30);
    } else {
      onChange(onlyDate);
    }
  }

  /* ---------- TimePicker (fallback) ---------- */
  function onConfirmTime({
    hours,
    minutes,
  }: {
    hours: number;
    minutes: number;
  }) {
    setOpenTime(false);
    const base = pendingDate ?? value ?? startOfDay(new Date());
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    setPendingDate(null);
    onChange(next);
  }
  function onDismissTime() {
    setOpenTime(false);
    if ((withTime || withOptionalTime) && pendingDate) onChange(pendingDate);
    setPendingDate(null);
  }

  /* ---------- iOS: picker nativo ---------- */
  function onNativeCancel() {
    if (pendingDate) onChange(pendingDate); // fica só a data
    setPendingDate(null);
    setOpenNativeTime(false);
  }
  function onNativeConfirm() {
    if (pendingDate) onChange(pendingDate);
    setPendingDate(null);
    setOpenNativeTime(false);
  }

  /* ---------- Slots (grelha) ---------- */
  function confirmSlot() {
    if (!pendingDate || !selectedSlot) {
      setOpenSlots(false);
      if (withTime && pendingDate) onChange(pendingDate); // obrigatório mas não escolheu
      setPendingDate(null);
      return;
    }
    const [h, m] = selectedSlot.split(":").map(Number);
    const dt = new Date(pendingDate);
    dt.setHours(h, m, 0, 0);
    onChange(dt);
    setSelectedSlot(null);
    setPendingDate(null);
    setOpenSlots(false);
  }
  function cancelSlot() {
    setOpenSlots(false);
    if (pendingDate) onChange(pendingDate); // opcional → só a data
    setSelectedSlot(null);
    setPendingDate(null);
  }

  function onClear() {
    setPendingDate(null);
    setSelectedSlot(null);
    onChange(null);
  }

  const initialHours =
    (value && value.getHours()) ||
    (pendingDate && pendingDate.getHours()) ||
    12;
  const initialMinutes =
    (value && value.getMinutes()) ||
    (pendingDate && pendingDate.getMinutes()) ||
    0;

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      <TextInput
        mode="outlined"
        label={label}
        value={display}
        onFocus={() => setOpenDate(true)}
        right={
          <TextInput.Icon
            icon={
              withTime || withOptionalTime || timeSlots
                ? "calendar-clock"
                : "calendar-month-outline"
            }
            onPress={() => setOpenDate(true)}
            forceTextInputFocus={false}
            accessibilityLabel="Escolher data"
          />
        }
        left={
          value ? (
            <TextInput.Icon
              icon="close"
              onPress={onClear}
              forceTextInputFocus={false}
              accessibilityLabel="Limpar"
            />
          ) : undefined
        }
        editable={!readOnly}
        error={!!error}
        style={[styles.input, fullWidth && styles.fullWidth]}
        outlineStyle={{ borderRadius: 16, borderWidth: 2 }}
        theme={{ roundness: 16 }}
        disabled={disabled}
      />

      {!!helperText && (
        <Text
          variant="bodySmall"
          style={[
            styles.helper,
            error
              ? { color: theme.colors.error }
              : { color: theme.colors.outline },
          ]}
        >
          {helperText}
        </Text>
      )}

      {/* Date */}
      <DatePickerModal
        locale={locale}
        mode="single"
        visible={openDate}
        onDismiss={() => setOpenDate(false)}
        date={value ?? undefined}
        onConfirm={onConfirmDate}
        validRange={{ startDate: minimumDate, endDate: maximumDate }}
        saveLabel="OK"
        label={label ?? "Selecionar data"}
      />

      {/* Slots: fundo neutro, grid com scroll e espaçamento estável */}
      <Portal>
        <Dialog
          visible={openSlots}
          onDismiss={cancelSlot}
          /* sem overflow hidden: iOS renderiza melhor */
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ textAlign: "center" }}>
            Selecionar hora
          </Dialog.Title>
          <Dialog.Content>
            <Surface
              elevation={0}
              style={{
                paddingVertical: 4,
                backgroundColor: theme.colors.surface,
              }}
            >
              <ScrollView
                style={{ maxHeight: 360 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.chipsWrap}>
                  {(timeSlots ?? []).map((s) => {
                    const active = selectedSlot === s.time;
                    return (
                      <SlotChip
                        key={s.time}
                        label={s.label ?? s.time}
                        disabled={!!s.disabled}
                        active={active}
                        onPress={() => !s.disabled && setSelectedSlot(s.time)}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            </Surface>
          </Dialog.Content>
          <Dialog.Actions style={styles.actions}>
            <Button onPress={cancelSlot}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={confirmSlot}
              /* mantém dentro do cartão em telas pequenas */
              style={{ alignSelf: "flex-end" }}
              contentStyle={{ paddingHorizontal: 16 }}
              compact
              disabled={
                !selectedSlot ||
                !!timeSlots?.find((t) => t.time === selectedSlot)?.disabled
              }
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* TimePicker fallback (Paper) */}
      {!timeSlots && (withTime || withOptionalTime) && !iosNativeTimePicker && (
        <TimePickerModal
          visible={openTime}
          onDismiss={onDismissTime}
          onConfirm={onConfirmTime}
          hours={initialHours}
          minutes={initialMinutes}
          use24HourClock={use24Hour}
          label="Selecionar hora"
          cancelLabel="Cancelar"
          confirmLabel="OK"
        />
      )}

      {/* iOS: picker nativo (sem slots) */}
      {(withTime || withOptionalTime) &&
        iosNativeTimePicker &&
        Platform.OS === "ios" &&
        openNativeTime && (
          <Portal>
            <Dialog
              visible
              onDismiss={onNativeCancel}
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Dialog.Title style={{ textAlign: "center" }}>
                Selecionar hora
              </Dialog.Title>
              <Dialog.Content>
                <DateTimePicker
                  mode="time"
                  value={pendingDate ?? value ?? new Date()}
                  display="spinner"
                  is24Hour={use24Hour}
                  onChange={(_, dt) => {
                    if (!dt) return;
                    const base = pendingDate ?? value ?? startOfDay(new Date());
                    const next = new Date(base);
                    next.setHours(dt.getHours(), dt.getMinutes(), 0, 0);
                    setPendingDate(next); // aplicamos no OK
                  }}
                />
              </Dialog.Content>
              <Dialog.Actions style={styles.actions}>
                <Button onPress={onNativeCancel}>Cancelar</Button>
                <Button mode="contained" onPress={onNativeConfirm}>
                  OK
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        )}
    </View>
  );
}

/* ---- Chip de slot sem “salto” ao selecionar ---- */
function SlotChip({
  label,
  disabled,
  active,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scale.value, { duration: 90 }) }],
  }));

  const ICON_SIZE = 18;
  const IconSpacer = () => <View style={{ width: ICON_SIZE }} />;

  const renderIcon = disabled
    ? () => <MIcon name="lock" size={ICON_SIZE} color={theme.colors.outline} />
    : active
    ? () => (
        <MIcon name="check" size={ICON_SIZE} color={theme.colors.onPrimary} />
      )
    : () => <IconSpacer />;

  return (
    <Animated.View style={[aStyle]}>
      <Chip
        compact
        mode="outlined"
        disabled={disabled}
        selected={active}
        onPress={() => {
          scale.value = 1.04;
          onPress?.();
          setTimeout(() => (scale.value = 1), 70);
        }}
        icon={renderIcon}
        style={[
          styles.chip,
          styles.chipBox, // 👈 altura/alinhamento aqui (em vez de contentStyle)
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: active
              ? theme.colors.primary
              : theme.colors.surfaceVariant,
          },
          disabled && { opacity: 0.45 },
        ]}
        textStyle={[
          styles.chipText,
          { color: active ? theme.colors.onPrimary : theme.colors.onSurface },
          disabled && {
            color: theme.colors.outline,
            textDecorationLine: "line-through",
          },
        ]}
      >
        {label}
      </Chip>
    </Animated.View>
  );
}

/* ---- utils ---- */
function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/** Cria slots automaticamente: "09:00" → "18:00" a cada `stepMinutes` */
export function generateTimeSlots(
  startHHmm: string,
  endHHmm: string,
  stepMinutes: number,
  disabledTimes: string[] = []
): TimeSlot[] {
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const pad = (n: number) => n.toString().padStart(2, "0");

  const start = toMin(startHHmm);
  const end = toMin(endHHmm);

  const out: TimeSlot[] = [];
  for (let t = start; t <= end; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const time = `${pad(h)}:${pad(m)}`;
    out.push({ time, disabled: disabledTimes.includes(time) });
  }
  return out;
}

const CHIP_HEIGHT = 36;

const styles = StyleSheet.create({
  fullWidth: { alignSelf: "stretch" },
  input: { backgroundColor: "#fff" },
  helper: { marginTop: 6, marginLeft: 12 },

  // dialog content
  scrollContent: { paddingHorizontal: 4 },

  // grelha de chips: sem “saltar” do cartão
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 10,
    columnGap: 10,
    paddingHorizontal: 4,
  },
  chip: {
    borderRadius: 18,
    minWidth: 84,
    margin: 0,
  },
  chipBox: {
    height: CHIP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { textAlign: "center", fontSize: 14, paddingHorizontal: 2 },

  actions: {
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginRight: 42,
  },
});

export default DateTimeField;
