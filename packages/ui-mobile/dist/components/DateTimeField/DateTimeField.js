import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// packages/ui-mobile/src/components/DateTimeField/DateTimeField.tsx
import * as React from "react";
import { Platform, StyleSheet, View, ScrollView, } from "react-native";
import { Text, TextInput, useTheme, Portal, Dialog, Button, Chip, Surface, } from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, } from "react-native-reanimated";
export function DateTimeField({ label, value, onChange, withTime = false, withOptionalTime = false, timeSlots, iosNativeTimePicker = false, minimumDate, maximumDate, error, helperText, fullWidth = true, style, use24Hour = true, locale = "pt", readOnly = true, disabled, }) {
    var _a, _b;
    const theme = useTheme();
    const [openDate, setOpenDate] = React.useState(false);
    const [openTime, setOpenTime] = React.useState(false);
    const [openNativeTime, setOpenNativeTime] = React.useState(false);
    const [openSlots, setOpenSlots] = React.useState(false);
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
    // === FIX: aceitar confirm sem data e não rebentar ===
    function onConfirmDate(params) {
        setOpenDate(false);
        const confirmed = params === null || params === void 0 ? void 0 : params.date;
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
        if ((withTime || withOptionalTime) &&
            iosNativeTimePicker &&
            Platform.OS === "ios") {
            setTimeout(() => setOpenNativeTime(true), 30);
            return;
        }
        if (withTime || withOptionalTime) {
            setTimeout(() => setOpenTime(true), 30);
        }
        else {
            onChange(onlyDate);
        }
    }
    function onDismissDate() {
        setOpenDate(false);
    }
    function onConfirmTime({ hours, minutes, }) {
        var _a;
        setOpenTime(false);
        const base = (_a = pendingDate !== null && pendingDate !== void 0 ? pendingDate : value) !== null && _a !== void 0 ? _a : startOfDay(new Date()); // nunca trabalhar com undefined
        const next = new Date(base);
        next.setHours(hours, minutes, 0, 0);
        setPendingDate(null);
        onChange(next);
    }
    function onDismissTime() {
        setOpenTime(false);
        // se só tinha escolhido data (hora opcional), mantém apenas a data
        if ((withTime || withOptionalTime) && pendingDate)
            onChange(pendingDate);
        setPendingDate(null);
    }
    function onNativeCancel() {
        if (pendingDate)
            onChange(pendingDate);
        setPendingDate(null);
        setOpenNativeTime(false);
    }
    function onNativeConfirm() {
        if (pendingDate)
            onChange(pendingDate);
        setPendingDate(null);
        setOpenNativeTime(false);
    }
    function confirmSlot() {
        if (!pendingDate || !selectedSlot) {
            setOpenSlots(false);
            if (withTime && pendingDate)
                onChange(pendingDate);
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
        if (pendingDate)
            onChange(pendingDate);
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
                ], children: helperText })), _jsx(DatePickerModal, { locale: locale, mode: "single", visible: openDate, onDismiss: onDismissDate, date: value !== null && value !== void 0 ? value : undefined, onConfirm: onConfirmDate, validRange: { startDate: minimumDate, endDate: maximumDate }, saveLabel: "OK", label: label !== null && label !== void 0 ? label : "Selecionar data" }), _jsx(Portal, { children: _jsxs(Dialog, { visible: openSlots, onDismiss: cancelSlot, style: { backgroundColor: theme.colors.surface }, children: [_jsx(Dialog.Title, { style: { textAlign: "center" }, children: "Selecionar hora" }), _jsx(Dialog.Content, { children: _jsx(Surface, { elevation: 0, style: {
                                    paddingVertical: 4,
                                    backgroundColor: theme.colors.surface,
                                }, children: _jsx(ScrollView, { style: { maxHeight: 360 }, contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false, children: _jsx(View, { style: styles.chipsWrap, children: (timeSlots !== null && timeSlots !== void 0 ? timeSlots : []).map((s) => {
                                            var _a;
                                            const active = selectedSlot === s.time;
                                            return (_jsx(SlotChip, { label: (_a = s.label) !== null && _a !== void 0 ? _a : s.time, disabled: !!s.disabled, active: active, onPress: () => !s.disabled && setSelectedSlot(s.time) }, s.time));
                                        }) }) }) }) }), _jsxs(Dialog.Actions, { style: styles.actions, children: [_jsx(Button, { onPress: cancelSlot, children: "Cancelar" }), _jsx(Button, { mode: "contained", onPress: confirmSlot, style: { alignSelf: "flex-end" }, contentStyle: { paddingHorizontal: 16 }, compact: true, disabled: !selectedSlot ||
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
                                    setPendingDate(next);
                                } }) }), _jsxs(Dialog.Actions, { style: styles.actions, children: [_jsx(Button, { onPress: onNativeCancel, children: "Cancelar" }), _jsx(Button, { mode: "contained", onPress: onNativeConfirm, children: "OK" })] })] }) }))] }));
}
/* ---- Chip e utils (inalterado) ---- */
function SlotChip({ label, disabled, active, onPress, }) {
    const theme = useTheme();
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scale.value, { duration: 90 }) }],
    }));
    const IconSpacer = () => _jsx(View, { style: { width: 20 } });
    return (_jsx(Animated.View, { style: [aStyle], children: _jsx(Chip, { compact: true, mode: "outlined", disabled: disabled, selected: active, onPress: () => {
                scale.value = 1.04;
                onPress === null || onPress === void 0 ? void 0 : onPress();
                setTimeout(() => (scale.value = 1), 70);
            }, icon: disabled ? "lock" : active ? "check" : () => _jsx(IconSpacer, {}), style: [
                styles.chip,
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
function startOfDay(d) {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
}
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
//# sourceMappingURL=DateTimeField.js.map