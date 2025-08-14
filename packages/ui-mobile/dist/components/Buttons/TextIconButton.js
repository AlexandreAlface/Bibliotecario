import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { TouchableRipple, Text, useTheme, Icon } from "react-native-paper";
const TextIconButton = ({ label, icon, onPress, variant = "solid", backgroundColor, color, iconSize = 20, iconPosition = "right", disabled = false, style, accessibilityLabel, }) => {
    const theme = useTheme();
    const isSolid = variant === "solid";
    const bg = isSolid ? backgroundColor !== null && backgroundColor !== void 0 ? backgroundColor : theme.colors.primary : "transparent";
    const fg = color !== null && color !== void 0 ? color : (isSolid ? theme.colors.onPrimary : theme.colors.primary);
    const ripple = isSolid ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)";
    return (_jsx(TouchableRipple, { onPress: onPress, disabled: disabled, style: [
            styles.container,
            isSolid ? styles.solidPadding : styles.ghostPadding,
            { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
            style,
        ], accessibilityRole: "button", accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : label, rippleColor: ripple, children: _jsxs(View, { style: styles.content, children: [iconPosition === "left" && (_jsx(Icon, { source: icon, size: iconSize, color: fg })), _jsx(Text, { variant: "labelLarge", style: [styles.label, { color: fg }], children: label }), iconPosition === "right" && (_jsx(Icon, { source: icon, size: iconSize, color: fg }))] }) }));
};
const styles = StyleSheet.create({
    container: {
        borderRadius: 6,
        alignSelf: "flex-start",
    },
    solidPadding: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    ghostPadding: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    label: {
        fontWeight: "500",
    },
});
export default TextIconButton;
//# sourceMappingURL=TextIconButton.js.map