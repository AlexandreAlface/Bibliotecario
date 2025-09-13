import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet } from "react-native";
import { Button as PaperButton, useTheme } from "react-native-paper";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
function ScaleOnPress({ disabled, children, }) {
    const pressed = useSharedValue(0);
    const anim = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(pressed.value ? 0.98 : 1, { duration: 90 }) }],
    }));
    return (_jsx(Animated.View, { style: anim, onTouchStart: () => !disabled && (pressed.value = 1), onTouchEnd: () => (pressed.value = 0), onTouchCancel: () => (pressed.value = 0), children: children }));
}
export function PrimaryButton({ label, style, contentStyle, labelStyle, fullWidth = true, compact = true, ...rest }) {
    const theme = useTheme();
    return (_jsx(ScaleOnPress, { disabled: rest.disabled, children: _jsx(PaperButton, { mode: "contained", uppercase: false, compact: compact, ...rest, style: [fullWidth && styles.fullWidth, styles.button, style], contentStyle: [compact ? styles.contentSm : styles.content, contentStyle], labelStyle: [
                compact ? styles.labelSm : styles.label,
                { color: theme.colors.onPrimary },
                labelStyle,
            ], children: label }) }));
}
export function SecondaryButton({ label, style, contentStyle, labelStyle, fullWidth = true, compact = true, ...rest }) {
    const theme = useTheme();
    return (_jsx(ScaleOnPress, { disabled: rest.disabled, children: _jsx(PaperButton, { mode: "outlined", uppercase: false, compact: compact, textColor: theme.colors.primary, theme: { colors: { outline: theme.colors.primary } }, ...rest, style: [
                fullWidth && styles.fullWidth,
                styles.button,
                { borderColor: theme.colors.primary, borderWidth: 2 },
                style,
            ], contentStyle: [compact ? styles.contentSm : styles.content, contentStyle], labelStyle: [
                compact ? styles.labelSm : styles.label,
                { color: theme.colors.primary },
                labelStyle,
            ], children: label }) }));
}
const styles = StyleSheet.create({
    fullWidth: { alignSelf: "stretch" },
    button: { borderRadius: 22 },
    content: { height: 56, borderRadius: 22 },
    contentSm: { height: 44, borderRadius: 22 }, // default (compact)
    label: { fontFamily: "Poppins_600SemiBold", fontSize: 16, letterSpacing: 0.3 },
    labelSm: { fontFamily: "Poppins_600SemiBold", fontSize: 14, letterSpacing: 0.2 },
});
//# sourceMappingURL=Buttons.js.map