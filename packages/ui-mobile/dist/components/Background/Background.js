import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";
export function Background({ children, style, hideShapes, center = 0.6 }) {
    var _a, _b;
    const theme = useTheme();
    const c1 = theme.colors.primary;
    const c2 = (_a = theme.colors.secondary) !== null && _a !== void 0 ? _a : "#66BB6A";
    const c3 = (_b = theme.colors.tertiary) !== null && _b !== void 0 ? _b : "#7E5AA6";
    const gradientColors = [c1, c2, c3];
    // clamp para evitar warnings
    const mid = Math.min(0.9, Math.max(0.1, center));
    const locations = [0, mid, 1];
    return (_jsxs(LinearGradient, { colors: gradientColors, locations: locations, start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, style: [styles.container, style], children: [!hideShapes && (_jsxs(_Fragment, { children: [_jsx(View, { style: [styles.shape, { top: 58, left: 36 }] }), _jsx(View, { style: [styles.shape, { top: 120, right: 58, transform: [{ rotate: "35deg" }] }] }), _jsx(View, { style: [styles.shape, { bottom: 120, left: 76, transform: [{ rotate: "12deg" }] }] }), _jsx(View, { style: [styles.shape, { bottom: 36, right: 32, transform: [{ rotate: "25deg" }] }] })] })), _jsx(View, { style: styles.content, children: children })] }));
}
const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    shape: {
        position: "absolute",
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
});
export default Background;
//# sourceMappingURL=Background.js.map