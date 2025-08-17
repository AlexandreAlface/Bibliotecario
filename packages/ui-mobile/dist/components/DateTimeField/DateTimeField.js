import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/ui-mobile/src/components/DateTimeField/DateTimeField.tsx
import * as React from "react";
import { Platform, StyleSheet, View, ScrollView, } from "react-native";
import { Text, TextInput, useTheme, Portal, Dialog, Button, Chip, Surface, } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, } from "react-native-reanimated";
import { MaterialCommunityIcons as MIcon } from "@expo/vector-icons";
export function DateTimeField({ label, value, onChange, withTime = false, withOptionalTime = false, timeSlots, iosNativeTimePicker = false, minimumDate, maximumDate, error, helperText, fullWidth = true, style, use24Hour = true, locale = "pt", readOnly = true, disabled, }) {
    var _a, _b;
    const theme = useTheme();
    const [openDate, setOpenDate] = React.useState(false);
    const [openTime, setOpenTime] = React.useState(false);
    const [openNativeTime, setOpenNativeTime] = React.useState(false);
    const [openSlots, setOpenSlots] = React.useState(false);
    /** guarda a data escolhida até o utilizador confirmar a hora */
    const [pendingDate, setPendingDate] = React.useState(null);
    const [selectedSlot, setSelectedSlot] = React.useState(null);
    const timeChosen = !!value && (value.getHours() !== 0 || value.getMinutes() !== 0);
    const display = React.useMemo(() => {
        if (!value)
            return "";
        const date = value.toLocaleDateString(locale);
        const mustShowTime = withTime ||
            (withOptionalTime && timeChosen) ||
            (!!timeSlots && timeChosen);
        if (!mustShowTime)
            return date;
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
    function onConfirmDate({ date }) {
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
        if ((withTime || withOptionalTime) &&
            iosNativeTimePicker &&
            Platform.OS === "ios") {
            setTimeout(() => setOpenNativeTime(true), 30);
            return;
        }
        // 3) modal do Paper
        if (withTime || withOptionalTime) {
            setTimeout(() => setOpenTime(true), 30);
        }
        else {
            onChange(onlyDate);
        }
    }
    /* ---------- TimePicker (fallback) ---------- */
    function onConfirmTime({ hours, minutes, }) {
        var _a;
        setOpenTime(false);
        const base = (_a = pendingDate !== null && pendingDate !== void 0 ? pendingDate : value) !== null && _a !== void 0 ? _a : startOfDay(new Date());
        const next = new Date(base);
        next.setHours(hours, minutes, 0, 0);
        setPendingDate(null);
        onChange(next);
    }
    function onDismissTime() {
        setOpenTime(false);
        if ((withTime || withOptionalTime) && pendingDate)
            onChange(pendingDate);
        setPendingDate(null);
    }
    /* ---------- iOS: picker nativo ---------- */
    function onNativeCancel() {
        if (pendingDate)
            onChange(pendingDate); // fica só a data
        setPendingDate(null);
        setOpenNativeTime(false);
    }
    function onNativeConfirm() {
        if (pendingDate)
            onChange(pendingDate);
        setPendingDate(null);
        setOpenNativeTime(false);
    }
    /* ---------- Slots (grelha) ---------- */
    function confirmSlot() {
        if (!pendingDate || !selectedSlot) {
            setOpenSlots(false);
            if (withTime && pendingDate)
                onChange(pendingDate); // obrigatório mas não escolheu
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
        if (pendingDate)
            onChange(pendingDate); // opcional → só a data
        setSelectedSlot(null);
        setPendingDate(null);
    }
    function onClear() {
        setPendingDate(null);
        setSelectedSlot(null);
        onChange(null);
    }
    const initialHours = (value && value.getHours()) ||
        (pendingDate && pendingDate.getHours()) ||
        12;
    const initialMinutes = (value && value.getMinutes()) ||
        (pendingDate && pendingDate.getMinutes()) ||
        0;
    return (_jsxs(View, { style: [fullWidth && styles.fullWidth, style], children: [_jsx(TextInput, { mode: "outlined", label: label, value: display, onFocus: () => setOpenDate(true), right: _jsx(TextInput.Icon, { icon: withTime || withOptionalTime || timeSlots
                        ? "calendar-clock"
                        : "calendar-month-outline", onPress: () => setOpenDate(true), forceTextInputFocus: false, accessibilityLabel: "Escolher data" }), left: value ? (_jsx(TextInput.Icon, { icon: "close", onPress: onClear, forceTextInputFocus: false, accessibilityLabel: "Limpar" })) : undefined, editable: !readOnly, error: !!error, style: [styles.input, fullWidth && styles.fullWidth], outlineStyle: { borderRadius: 16, borderWidth: 2 }, theme: { roundness: 16 }, disabled: disabled }), !!helperText && (_jsx(Text, { variant: "bodySmall", style: [
                    styles.helper,
                    error
                        ? { color: theme.colors.error }
                        : { color: theme.colors.outline },
                ], children: helperText })), _jsx(DatePickerModal, { locale: locale, mode: "single", visible: openDate, onDismiss: () => setOpenDate(false), date: value !== null && value !== void 0 ? value : undefined, onConfirm: onConfirmDate, validRange: { startDate: minimumDate, endDate: maximumDate }, saveLabel: "OK", label: label !== null && label !== void 0 ? label : "Selecionar data" }), _jsx(Portal, { children: _jsxs(Dialog, { visible: openSlots, onDismiss: cancelSlot, 
                    /* sem overflow hidden: iOS renderiza melhor */
                    style: { backgroundColor: theme.colors.surface }, children: [_jsx(Dialog.Title, { style: { textAlign: "center" }, children: "Selecionar hora" }), _jsx(Dialog.Content, { children: _jsx(Surface, { elevation: 0, style: {
                                    paddingVertical: 4,
                                    backgroundColor: theme.colors.surface,
                                }, children: _jsx(ScrollView, { style: { maxHeight: 360 }, contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false, children: _jsx(View, { style: styles.chipsWrap, children: (timeSlots !== null && timeSlots !== void 0 ? timeSlots : []).map((s) => {
                                            var _a;
                                            const active = selectedSlot === s.time;
                                            return (_jsx(SlotChip, { label: (_a = s.label) !== null && _a !== void 0 ? _a : s.time, disabled: !!s.disabled, active: active, onPress: () => !s.disabled && setSelectedSlot(s.time) }, s.time));
                                        }) }) }) }) }), _jsxs(Dialog.Actions, { style: styles.actions, children: [_jsx(Button, { onPress: cancelSlot, children: "Cancelar" }), _jsx(Button, { mode: "contained", onPress: confirmSlot, 
                                    /* mantém dentro do cartão em telas pequenas */
                                    style: { alignSelf: "flex-end" }, contentStyle: { paddingHorizontal: 16 }, compact: true, disabled: !selectedSlot ||
                                        !!((_a = timeSlots === null || timeSlots === void 0 ? void 0 : timeSlots.find((t) => t.time === selectedSlot)) === null || _a === void 0 ? void 0 : _a.disabled), children: "OK" })] })] }) }), !timeSlots && (withTime || withOptionalTime) && !iosNativeTimePicker && (_jsx(TimePickerModal, { visible: openTime, onDismiss: onDismissTime, onConfirm: onConfirmTime, hours: initialHours, minutes: initialMinutes, use24HourClock: use24Hour, label: "Selecionar hora", cancelLabel: "Cancelar", confirmLabel: "OK" })), (withTime || withOptionalTime) &&
                iosNativeTimePicker &&
                Platform.OS === "ios" &&
                openNativeTime && (_jsx(Portal, { children: _jsxs(Dialog, { visible: true, onDismiss: onNativeCancel, style: { backgroundColor: theme.colors.surface }, children: [_jsx(Dialog.Title, { style: { textAlign: "center" }, children: "Selecionar hora" }), _jsx(Dialog.Content, { children: _jsx(DateTimePicker, { mode: "time", value: (_b = pendingDate !== null && pendingDate !== void 0 ? pendingDate : value) !== null && _b !== void 0 ? _b : new Date(), display: "spinner", is24Hour: use24Hour, onChange: (_, dt) => {
                                    var _a;
                                    if (!dt)
                                        return;
                                    const base = (_a = pendingDate !== null && pendingDate !== void 0 ? pendingDate : value) !== null && _a !== void 0 ? _a : startOfDay(new Date());
                                    const next = new Date(base);
                                    next.setHours(dt.getHours(), dt.getMinutes(), 0, 0);
                                    setPendingDate(next); // aplicamos no OK
                                } }) }), _jsxs(Dialog.Actions, { style: styles.actions, children: [_jsx(Button, { onPress: onNativeCancel, children: "Cancelar" }), _jsx(Button, { mode: "contained", onPress: onNativeConfirm, children: "OK" })] })] }) }))] }));
}
/* ---- Chip de slot sem “salto” ao selecionar ---- */
function SlotChip({ label, disabled, active, onPress, }) {
    const theme = useTheme();
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scale.value, { duration: 90 }) }],
    }));
    const ICON_SIZE = 18;
    const IconSpacer = () => _jsx(View, { style: { width: ICON_SIZE } });
    const renderIcon = disabled
        ? () => _jsx(MIcon, { name: "lock", size: ICON_SIZE, color: theme.colors.outline })
        : active
            ? () => (_jsx(MIcon, { name: "check", size: ICON_SIZE, color: theme.colors.onPrimary }))
            : () => _jsx(IconSpacer, {});
    return (_jsx(Animated.View, { style: [aStyle], children: _jsx(Chip, { compact: true, mode: "outlined", disabled: disabled, selected: active, onPress: () => {
                scale.value = 1.04;
                onPress === null || onPress === void 0 ? void 0 : onPress();
                setTimeout(() => (scale.value = 1), 70);
            }, icon: renderIcon, style: [
                styles.chip,
                styles.chipBox, // 👈 altura/alinhamento aqui (em vez de contentStyle)
                {
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                },
                disabled && { opacity: 0.45 },
            ], textStyle: [
                styles.chipText,
                { color: active ? theme.colors.onPrimary : theme.colors.onSurface },
                disabled && {
                    color: theme.colors.outline,
                    textDecorationLine: "line-through",
                },
            ], children: label }) }));
}
/* ---- utils ---- */
function startOfDay(d) {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
}
/** Cria slots automaticamente: "09:00" → "18:00" a cada `stepMinutes` */
export function generateTimeSlots(startHHmm, endHHmm, stepMinutes, disabledTimes = []) {
    const toMin = (hhmm) => {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
    };
    const pad = (n) => n.toString().padStart(2, "0");
    const start = toMin(startHHmm);
    const end = toMin(endHHmm);
    const out = [];
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
//# sourceMappingURL=DateTimeField.js.map