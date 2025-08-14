import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet, Image, ScrollView, } from "react-native";
import { Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
const FlexibleCard = ({ title, subtitle, children, header, footer, images, carouselHeight = 160, carouselGap = 8, imageRadius = 12, backgroundColor, elevation = 1, padding = 16, style, onPress, accessibilityLabel, }) => {
    var _a;
    const theme = useTheme();
    const bg = backgroundColor !== null && backgroundColor !== void 0 ? backgroundColor : theme.colors.surfaceVariant;
    const Body = (_jsx(View, { style: [styles.clip, { borderRadius: 16 }], children: _jsxs(View, { style: [styles.inner, { padding }], children: [header ? _jsx(View, { style: { marginBottom: 8 }, children: header }) : null, (title || subtitle) && (_jsxs(View, { style: { marginBottom: children || images ? 8 : 0 }, children: [title ? (_jsx(Text, { variant: "titleMedium", style: { fontWeight: "700", color: theme.colors.onSurface }, children: title })) : null, subtitle ? (_jsx(Text, { variant: "bodyMedium", style: { color: theme.colors.onSurfaceVariant, marginTop: title ? 4 : 0 }, children: subtitle })) : null] })), images && images.length > 0 && (_jsx(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: carouselGap }, style: { marginBottom: children ? 12 : 0 }, children: images.map((src, idx) => (_jsx(Image, { source: typeof src === "string" ? { uri: src } : src, style: {
                            width: carouselHeight * 1.4,
                            height: carouselHeight,
                            borderRadius: imageRadius,
                            backgroundColor: theme.colors.surface,
                        }, resizeMode: "cover", accessible: true, accessibilityRole: "image" }, idx))) })), children, footer ? _jsx(View, { style: { marginTop: 12 }, children: footer }) : null] }) }));
    return (_jsx(Surface, { elevation: elevation, style: [styles.card, { backgroundColor: bg }, style], children: onPress ? (_jsx(TouchableRipple, { onPress: onPress, borderless: true, style: { borderRadius: 16 }, accessibilityRole: "button", accessibilityLabel: (_a = accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : title) !== null && _a !== void 0 ? _a : "Cartão", children: _jsx(View, { children: Body }) })) : (Body) }));
};
const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        width: "100%",
        alignSelf: "center",
    },
    // clipping de conteúdo para respeitar o raio, sem quebrar sombra do Surface
    clip: {
        overflow: "hidden",
    },
    inner: {
        width: "100%",
    },
});
export default FlexibleCard;
//# sourceMappingURL=FlexibleCard.js.map