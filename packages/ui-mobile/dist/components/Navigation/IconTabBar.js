import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Surface, TouchableRipple, Icon, useTheme, Badge } from "react-native-paper";
export function IconTabBar({ items, activeKey, onChange, variant = "ig", backgroundColor, activePillColor, activeIconColor, inactiveIconColor, iconSize = 26, pillSize = 40, elevation = 1, showTopBorder = variant === "ig", style, accessibilityLabel = "Menu de navegação", }) {
    const theme = useTheme();
    const bg = backgroundColor !== null && backgroundColor !== void 0 ? backgroundColor : (variant === "ig" ? "#fff" : theme.colors.surface);
    const pill = activePillColor !== null && activePillColor !== void 0 ? activePillColor : theme.colors.secondaryContainer;
    const activeIcon = activeIconColor !== null && activeIconColor !== void 0 ? activeIconColor : (variant === "ig" ? "#000000" : theme.colors.onSecondaryContainer);
    const inactiveIcon = inactiveIconColor !== null && inactiveIconColor !== void 0 ? inactiveIconColor : (variant === "ig" ? "#262626" : theme.colors.onSurfaceVariant);
    // 1 animador por item (0 = inativo, 1 = ativo)
    const animsRef = React.useRef({});
    if (Object.keys(animsRef.current).length !== items.length) {
        const map = {};
        for (const it of items)
            map[String(it.key)] = new Animated.Value(it.key === activeKey ? 1 : 0);
        animsRef.current = map;
    }
    // anima a transição quando activeKey muda
    React.useEffect(() => {
        const animations = items.map((it) => Animated.timing(animsRef.current[String(it.key)], {
            toValue: it.key === activeKey ? 1 : 0,
            duration: 160,
            useNativeDriver: true,
        }));
        Animated.parallel(animations).start();
    }, [activeKey, items]);
    return (_jsx(Surface, { elevation: elevation, style: [
            styles.container,
            variant === "ig" && styles.igContainer,
            {
                backgroundColor: bg,
                borderTopWidth: showTopBorder ? StyleSheet.hairlineWidth : 0,
                borderTopColor: showTopBorder ? "#e3e3e3" : "transparent",
                borderRadius: variant === "pill" ? 16 : 0,
            },
            style,
        ], accessibilityRole: "tablist", accessibilityLabel: accessibilityLabel, children: items.map((item) => {
            const selected = item.key === activeKey;
            const isDisabled = !!item.disabled;
            // valores animados
            const a = animsRef.current[String(item.key)];
            const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
            const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
            // bounce no press
            const pressScale = new Animated.Value(1);
            const onPressIn = () => Animated.spring(pressScale, { toValue: 0.9, speed: 40, bounciness: 0, useNativeDriver: true }).start();
            const onPressOut = () => {
                Animated.spring(pressScale, { toValue: 1, speed: 30, useNativeDriver: true }).start();
                !isDisabled && onChange(item.key);
            };
            return (_jsx(TouchableRipple, { onPressIn: onPressIn, onPressOut: onPressOut, onLongPress: item.onLongPress, disabled: isDisabled, borderless: true, rippleColor: "rgba(0,0,0,0.08)", accessibilityRole: "tab", accessibilityLabel: item.accessibilityLabel, accessibilityState: { selected, disabled: isDisabled }, style: styles.tabTouchable, children: _jsxs(View, { style: styles.tabInner, children: [variant === "pill" && selected && (_jsx(View, { pointerEvents: "none", style: [
                                styles.pill,
                                { width: pillSize, height: pillSize, borderRadius: pillSize / 2, backgroundColor: pill },
                            ] })), _jsx(Animated.View, { style: { transform: [{ scale }, { scale: pressScale }], opacity }, children: _jsx(Icon, { source: item.icon, size: iconSize, color: selected ? activeIcon : inactiveIcon }) }), typeof item.badgeCount === "number" && item.badgeCount > 0 && (_jsx(View, { style: styles.badgeWrapper, pointerEvents: "none", children: _jsx(Badge, { children: item.badgeCount }) }))] }) }, String(item.key)));
        }) }));
}
const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    igContainer: {
        borderRadius: 0,
        paddingHorizontal: 22,
        paddingBottom: 8,
    },
    tabTouchable: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
    },
    tabInner: {
        width: 36,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    pill: {
        position: "absolute",
        opacity: 0.35,
    },
    badgeWrapper: {
        position: "absolute",
        right: 2,
        top: 0,
    },
});
export default IconTabBar;
//# sourceMappingURL=IconTabBar.js.map