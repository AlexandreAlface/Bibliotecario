import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// packages/ui-mobile/src/components/TextField/TextField.tsx
import * as React from "react";
import { StyleSheet } from "react-native";
import { Text, TextInput, useTheme } from "react-native-paper";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor, } from "react-native-reanimated";
export function TextField({ fullWidth = true, style, secureTextEntry, right, left, onFocus, onBlur, helperText, variant = "default", autoCapitalize, keyboardType, error, ...props }) {
    var _a;
    const theme = useTheme();
    // anima foco para sombra/borda
    const focused = useSharedValue(0);
    const containerAStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(focused.value, [0, 1], [theme.colors.outline, error ? theme.colors.error : theme.colors.primary]);
        const shadow = focused.value ? 0.15 : 0;
        return {
            borderColor,
            shadowOpacity: withTiming(shadow, { duration: 120 }),
            shadowRadius: withTiming(focused.value ? 8 : 0, { duration: 120 }),
            elevation: focused.value ? 2 : 0,
        };
    });
    const [hide, setHide] = React.useState(variant === "password" ? true : !!secureTextEntry);
    // presets por variante
    const preset = React.useMemo(() => {
        switch (variant) {
            case "email":
                return {
                    autoCapitalize: "none",
                    keyboardType: "email-address",
                    left: _jsx(TextInput.Icon, { icon: "email-outline" }),
                };
            case "number":
                return {
                    keyboardType: "numeric",
                    left: _jsx(TextInput.Icon, { icon: "numeric" }),
                };
            case "password":
                return {
                    autoCapitalize: "none",
                    secureTextEntry: hide,
                    left: _jsx(TextInput.Icon, { icon: "lock-outline" }),
                    right: (_jsx(TextInput.Icon, { icon: hide ? "eye-off-outline" : "eye-outline", onPress: () => setHide((v) => !v), forceTextInputFocus: false, accessibilityLabel: hide ? "Mostrar palavra-passe" : "Esconder palavra-passe" })),
                };
            default:
                return {};
        }
    }, [variant, hide]);
    return (_jsxs(_Fragment, { children: [_jsx(Animated.View, { style: [
                    styles.container,
                    fullWidth && styles.fullWidth,
                    containerAStyle,
                    style,
                    error && { borderColor: theme.colors.error },
                ], children: _jsx(TextInput, { mode: "flat" // 👈 sem borda própria
                    , style: styles.input, underlineColor: "transparent", selectionColor: theme.colors.primary, autoCapitalize: autoCapitalize !== null && autoCapitalize !== void 0 ? autoCapitalize : preset.autoCapitalize, keyboardType: keyboardType !== null && keyboardType !== void 0 ? keyboardType : preset.keyboardType, secureTextEntry: (_a = preset.secureTextEntry) !== null && _a !== void 0 ? _a : secureTextEntry, left: left !== null && left !== void 0 ? left : preset.left, right: right !== null && right !== void 0 ? right : preset.right, onFocus: (e) => {
                        focused.value = 1;
                        onFocus === null || onFocus === void 0 ? void 0 : onFocus(e);
                    }, onBlur: (e) => {
                        focused.value = 0;
                        onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
                    }, ...props }) }), !!helperText && (_jsx(Text, { variant: "bodySmall", style: [
                    styles.helper,
                    error ? { color: theme.colors.error } : { color: theme.colors.outline },
                ], children: helperText }))] }));
}
const styles = StyleSheet.create({
    fullWidth: { alignSelf: "stretch" },
    container: {
        borderWidth: 2,
        borderRadius: 16,
        backgroundColor: "#fff", // 👈 “corta” qualquer coisa por baixo
        overflow: "hidden",
    },
    input: {
        backgroundColor: "#fff", // reforço (Android)
    },
    helper: { marginTop: 6, marginLeft: 12 },
});
export default TextField;
//# sourceMappingURL=TextField.js.map