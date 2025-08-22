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

/** slot tipo agenda */
export type TimeSlot = { time: string; label?: string; disabled?: boolean };

export type DateTimeFieldProps = {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;

  withTime?: boolean;
  withOptionalTime?: boolean;

  timeSlots?: TimeSlot[];
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

  // === FIX: aceitar confirm sem data e não rebentar ===
  function onConfirmDate(params?: { date?: Date }) {
    setOpenDate(false);

    const confirmed = params?.date;
    if (!confirmed) {
      // Não escolheu nada: não mexemos no valor atual.
      // Se quisermos forçar hora obrigatória apenas quando há data, saímos aqui.
      setPendingDate(null);
      setSelectedSlot(null);
      return;
    }

    const onlyDate = startOfDay(confirmed);
    setPendingDate(onlyDate);

    if (timeSlots && (withTime || withOptionalTime)) {
      setSelectedSlot(null);
      setTimeout(() => setOpenSlots(true), 30);
      return;
    }

    if (
      (withTime || withOptionalTime) &&
      iosNativeTimePicker &&
      Platform.OS === "ios"
    ) {
      setTimeout(() => setOpenNativeTime(true), 30);
      return;
    }

    if (withTime || withOptionalTime) {
      setTimeout(() => setOpenTime(true), 30);
    } else {
      onChange(onlyDate);
    }
  }

  function onDismissDate() {
    setOpenDate(false);
  }

  function onConfirmTime({
    hours,
    minutes,
  }: {
    hours: number;
    minutes: number;
  }) {
    setOpenTime(false);
    const base = pendingDate ?? value ?? startOfDay(new Date()); // nunca trabalhar com undefined
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    setPendingDate(null);
    onChange(next);
  }

  function onDismissTime() {
    setOpenTime(false);
    // se só tinha escolhido data (hora opcional), mantém apenas a data
    if ((withTime || withOptionalTime) && pendingDate) onChange(pendingDate);
    setPendingDate(null);
  }

  function onNativeCancel() {
    if (pendingDate) onChange(pendingDate);
    setPendingDate(null);
    setOpenNativeTime(false);
  }
  function onNativeConfirm() {
    if (pendingDate) onChange(pendingDate);
    setPendingDate(null);
    setOpenNativeTime(false);
  }

  function confirmSlot() {
    if (!pendingDate || !selectedSlot) {
      setOpenSlots(false);
      if (withTime && pendingDate) onChange(pendingDate);
      setPendingDate(null);
      setSelectedSlot(null);
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
    if (pendingDate) onChange(pendingDate);
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
        onDismiss={onDismissDate}
        date={value ?? undefined}
        onConfirm={onConfirmDate} // ← seguro a undefined
        validRange={{ startDate: minimumDate, endDate: maximumDate }}
        saveLabel="OK"
        label={label ?? "Selecionar data"}
      />

      {/* Slots */}
      <Portal>
        <Dialog
          visible={openSlots}
          onDismiss={cancelSlot}
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

      {/* TimePicker (fallback) */}
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

      {/* iOS nativo */}
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
                    setPendingDate(next);
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

/* ---- Chip e utils (inalterado) ---- */
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
  const IconSpacer = () => <View style={{ width: 20 }} />;

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
        icon={disabled ? "lock" : active ? "check" : () => <IconSpacer />}
        style={[
          styles.chip,
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

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

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
  scrollContent: { paddingHorizontal: 4 },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 10,
    columnGap: 10,
    paddingHorizontal: 4,
  },
  chip: { borderRadius: 18, minWidth: 84, margin: 0, color: "#000" },
  chipText: { textAlign: "center", fontSize: 14, paddingHorizontal: 2 },
  actions: {
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginRight: 42,
  },
});
export default DateTimeField;
