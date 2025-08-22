import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { Divider as PaperDivider, Text, useTheme } from "react-native-paper";
const DividerText = ({ label, spacing = 8, color, style, }) => {
    const theme = useTheme();
    return (_jsxs(View, { style: [styles.container, { marginVertical: spacing }, style], children: [_jsx(View, { style: styles.line, children: _jsx(PaperDivider, { style: { flex: 1, backgroundColor: color !== null && color !== void 0 ? color : theme.colors.outlineVariant }, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), label ? (_jsx(Text, { variant: "labelMedium", style: [styles.label, { color: theme.colors.onSurfaceVariant }], accessibilityLabel: label, children: label })) : null, label ? (_jsx(View, { style: styles.line, children: _jsx(PaperDivider, { style: { flex: 1, backgroundColor: color !== null && color !== void 0 ? color : theme.colors.outlineVariant }, accessibilityElementsHidden: true, importantForAccessibility: "no" }) })) : null] }));
};
const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
    },
    line: {
        flex: 1,
    },
    label: {
        marginHorizontal: 12,
    },
});
export default DividerText;
//# sourceMappingURL=DividerText.js.map