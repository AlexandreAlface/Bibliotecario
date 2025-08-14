import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
const StepCard = ({ step, title, description, accentColor, backgroundColor, circleSize = 64, elevation = 1, style, accessibilityLabel, }) => {
    var _a;
    const theme = useTheme();
    const circleBg = accentColor !== null && accentColor !== void 0 ? accentColor : theme.colors.primary;
    const cardBg = backgroundColor !== null && backgroundColor !== void 0 ? backgroundColor : 
    // tom clarinho a partir do secondaryContainer (fica “lavanda” na maioria dos temas)
    ((_a = theme.colors.secondaryContainer) !== null && _a !== void 0 ? _a : theme.colors.surface);
    return (_jsxs(View, { style: [styles.wrapper, style], accessibilityRole: "summary", accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : `Passo ${step}: ${title}${description ? ". " + description : ""}`, children: [_jsx(View, { style: [
                    styles.badge,
                    {
                        width: circleSize,
                        height: circleSize,
                        borderRadius: circleSize / 2,
                        backgroundColor: circleBg,
                        // “borda” branca para dar recorte do cartão (como nas tuas prints)
                        borderWidth: 6,
                        borderColor: "#fff",
                    },
                ], accessible: false, children: _jsx(Text, { variant: "headlineSmall", style: { color: "#fff", fontWeight: "700" }, accessibilityElementsHidden: true, importantForAccessibility: "no", children: step }) }), _jsxs(Surface, { elevation: elevation, style: [
                    styles.card,
                    {
                        backgroundColor: cardBg,
                    },
                ], children: [_jsx(Text, { variant: "titleMedium", style: { textAlign: "center", color: theme.colors.primary, fontWeight: "700" }, children: title }), Boolean(description) && (_jsx(Text, { variant: "bodyMedium", style: {
                            marginTop: 8,
                            textAlign: "center",
                            color: theme.colors.onSurfaceVariant,
                        }, children: description }))] })] }));
};
const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
    },
    badge: {
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        // posicionado por cima do cartão:
        marginBottom: -20,
    },
    card: {
        width: "100%",
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
});
export default StepCard;
//# sourceMappingURL=StepCard.js.map