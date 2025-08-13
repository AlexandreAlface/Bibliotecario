import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, RadioButton, HelperText, ActivityIndicator, Surface, } from "react-native-paper";
export const RadioOptionGroup = ({ label, options, value, onChange, orientation = "horizontal", disabled = false, loading = false, required = false, helperText, errorText, elevated = false, indicator = "paper", testID, accessibilityLabel, style, }) => {
    const theme = useTheme();
    const Wrapper = elevated ? Surface : View;
    const accessibilityRole = "radiogroup";
    const renderIndicator = (checked, isDisabled) => {
        if (indicator === "paper") {
            return (_jsx(RadioButton, { value: checked ? "checked" : "unchecked", disabled: isDisabled, status: checked ? "checked" : "unchecked" }));
        }
        // indicador "circle" (bolinha)
        const size = 22;
        const inner = 12;
        const borderColor = isDisabled
            ? theme.colors.outline
            : checked
                ? theme.colors.primary
                : theme.colors.outline;
        const fill = isDisabled
            ? theme.colors.surfaceVariant
            : theme.colors.primary;
        return (_jsx(View, { style: [
                styles.circleOuter,
                { width: size, height: size, borderRadius: size / 2, borderColor },
                isDisabled && { opacity: 0.6 },
            ], pointerEvents: "none", children: checked && (_jsx(View, { style: [
                    styles.circleInner,
                    {
                        width: inner,
                        height: inner,
                        borderRadius: inner / 2,
                        backgroundColor: fill,
                    },
                ] })) }));
    };
    return (_jsxs(Wrapper, { style: [
            styles.wrapper,
            elevated && { borderRadius: theme.roundness, padding: 12, elevation: 1 },
            style,
        ], testID: testID, accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : label, accessibilityRole: accessibilityRole, accessibilityState: { disabled: disabled || loading }, children: [!!label && (_jsxs(Text, { variant: "titleSmall", style: [
                    styles.label,
                    { color: theme.colors.onSurface },
                    errorText ? { color: theme.colors.error } : null,
                ], accessibilityLabel: label + (required ? " (obrigatório)" : ""), children: [label, required ? " *" : ""] })), loading ? (_jsx(View, { style: [styles.loader, orientation === "horizontal" && { alignSelf: "flex-start" }], children: _jsx(ActivityIndicator, { accessibilityLabel: "A carregar op\u00E7\u00F5es" }) })) : (_jsx(View, { style: [
                    styles.optionsContainer,
                    orientation === "horizontal" ? styles.row : styles.column,
                ], accessibilityRole: "radiogroup", children: options.map((opt) => {
                    var _a;
                    const checked = value === opt.value;
                    const isDisabled = disabled || !!opt.disabled;
                    return (_jsxs(Pressable, { onPress: () => !isDisabled && (onChange === null || onChange === void 0 ? void 0 : onChange(opt.value)), style: [
                            styles.option,
                            orientation === "horizontal" ? styles.optionRow : styles.optionColumn,
                        ], accessibilityRole: "radio", accessibilityLabel: (_a = opt.accessibilityLabel) !== null && _a !== void 0 ? _a : opt.label, accessibilityState: { checked, disabled: isDisabled }, disabled: isDisabled, hitSlop: 8, children: [renderIndicator(checked, isDisabled), _jsx(Text, { variant: "titleSmall", style: [styles.optionLabel, isDisabled && { opacity: 0.5 }], children: opt.label })] }, opt.value));
                }) })), !!helperText && !errorText && (_jsx(HelperText, { type: "info", visible: true, style: styles.helper, children: helperText })), !!errorText && (_jsx(HelperText, { type: "error", visible: true, style: styles.helper, children: errorText }))] }));
};
const styles = StyleSheet.create({
    wrapper: { width: "100%" },
    label: { marginBottom: 8, fontWeight: "600" },
    optionsContainer: { gap: 24, flexWrap: "wrap" },
    row: { flexDirection: "row", alignItems: "center" },
    column: { flexDirection: "column" },
    option: { alignItems: "center" },
    optionRow: { flexDirection: "row", gap: 8 },
    optionColumn: { flexDirection: "row", gap: 8, marginBottom: 4 },
    optionLabel: { alignSelf: "center" },
    loader: { paddingVertical: 8 },
    helper: { marginTop: 6 },
    circleOuter: {
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    circleInner: {},
});
export default RadioOptionGroup;
//# sourceMappingURL=RadioInlineGroup.js.map