import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { Chip, Divider, useTheme } from "react-native-paper";
const FilterBar = ({ chips, style, dividerColor }) => {
    const theme = useTheme();
    return (_jsxs(View, { style: style, children: [_jsx(View, { style: styles.row, children: chips.map((chip) => (_jsx(Chip, { icon: chip.icon, selected: chip.selected, onPress: chip.onPress, onClose: chip.onClear, mode: "flat", style: [
                        styles.chip,
                        {
                            backgroundColor: theme.colors.primary,
                        },
                    ], textStyle: {
                        color: theme.colors.onPrimary,
                        fontWeight: "600",
                    }, children: chip.label }, chip.id))) }), _jsx(Divider, { style: [
                    styles.divider,
                    { backgroundColor: dividerColor || theme.colors.outlineVariant },
                ] })] }));
};
const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        borderRadius: 999,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        width: "100%",
    },
});
export default FilterBar;
//# sourceMappingURL=FilterBar.js.map