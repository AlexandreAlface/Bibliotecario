import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { TouchableRipple, Icon, Text, useTheme } from "react-native-paper";
const NotificationBell = ({ count = 0, showZero = false, maxCount = 99, icon = "bell-outline", size = 24, badgeColor, badgeTextColor, onPress, disabled = false, style, accessibilityLabel, }) => {
    const theme = useTheme();
    const hasBadge = showZero ? true : count > 0;
    const badgeValue = count > maxCount ? `${maxCount}+` : String(count);
    return (_jsx(TouchableRipple, { onPress: onPress, disabled: disabled, borderless: true, style: [styles.touchable, style], rippleColor: "rgba(0,0,0,0.15)", accessibilityRole: "button", accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : (count > 0 ? `Abrir notificações. ${count} novas.` : "Abrir notificações"), children: _jsxs(View, { style: styles.iconWrapper, children: [_jsx(Icon, { source: icon, size: size, color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }), hasBadge && (_jsx(View, { style: [
                        styles.badge,
                        {
                            backgroundColor: badgeColor !== null && badgeColor !== void 0 ? badgeColor : theme.colors.error,
                            minWidth: size * 0.75,
                            height: size * 0.75,
                            borderRadius: (size * 0.75) / 2,
                        },
                    ], pointerEvents: "none", accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants", children: _jsx(Text, { variant: "labelSmall", style: {
                            color: badgeTextColor !== null && badgeTextColor !== void 0 ? badgeTextColor : theme.colors.onError,
                            fontWeight: "700",
                        }, children: badgeValue }) }))] }) }));
};
const styles = StyleSheet.create({
    touchable: {
        borderRadius: 999,
        padding: 6, // área de toque confortável
        alignSelf: "flex-start",
    },
    iconWrapper: {
        justifyContent: "center",
        alignItems: "center",
    },
    badge: {
        position: "absolute",
        top: -2,
        right: -2,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
});
export default NotificationBell;
//# sourceMappingURL=NotificationBell.js.map