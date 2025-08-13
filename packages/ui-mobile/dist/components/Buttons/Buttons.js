import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet } from "react-native";
import { Button as PaperButton, useTheme } from "react-native-paper";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, } from "react-native-reanimated";
function ScaleOnPress({ disabled, children, }) {
    const pressed = useSharedValue(0);
    const anim = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(pressed.value ? 0.98 : 1, { duration: 90 }) }],
    }));
    return (_jsx(Animated.View, { style: anim, onTouchStart: () => !disabled && (pressed.value = 1), onTouchEnd: () => (pressed.value = 0), onTouchCancel: () => (pressed.value = 0), children: children }));
}
export const PrimaryButton = ({ children, label, style, contentStyle, labelStyle, fullWidth = true, ...rest }) => {
    const theme = useTheme();
    return (_jsx(ScaleOnPress, { disabled: rest.disabled, children: _jsx(PaperButton, { mode: "contained", uppercase: false, ...rest, style: [fullWidth && styles.fullWidth, styles.button, style], contentStyle: [styles.content, contentStyle], labelStyle: [
                styles.label,
                { color: theme.colors.onPrimary },
                labelStyle,
            ], children: children !== null && children !== void 0 ? children : label }) }));
};
export const SecondaryButton = ({ children, label, style, contentStyle, labelStyle, fullWidth = true, ...rest }) => {
    const theme = useTheme();
    return (_jsx(ScaleOnPress, { disabled: rest.disabled, children: _jsx(PaperButton, { mode: "outlined", uppercase: false, textColor: theme.colors.primary, 
            // alguns temas precisam disto para a cor da borda
            theme: { colors: { outline: theme.colors.primary } }, ...rest, style: [
                fullWidth && styles.fullWidth,
                styles.button,
                { borderColor: theme.colors.primary, borderWidth: 2 },
                style,
            ], contentStyle: [styles.content, contentStyle], labelStyle: [styles.label, { color: theme.colors.primary }, labelStyle], children: children !== null && children !== void 0 ? children : label }) }));
};
const styles = StyleSheet.create({
    fullWidth: { alignSelf: "stretch" },
    button: { borderRadius: 28 },
    content: { height: 56, borderRadius: 28 },
    label: { fontFamily: "Poppins_600SemiBold", fontSize: 16, letterSpacing: 0.3 },
});
//# sourceMappingURL=Buttons.js.map