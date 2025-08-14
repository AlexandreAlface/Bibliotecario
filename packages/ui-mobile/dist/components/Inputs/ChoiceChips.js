import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { Chip, Text, useTheme } from "react-native-paper";
const ChoiceChips = ({ title, options, value, multiple = false, onChange, size = "md", gap = 8, style, titleStyle, disabled, }) => {
    const theme = useTheme();
    const isSelected = (id) => multiple ? Array.isArray(value) && value.includes(id) : value === id;
    const toggle = (id) => {
        if (!onChange)
            return;
        if (multiple) {
            const current = Array.isArray(value) ? value : [];
            const next = current.includes(id)
                ? current.filter((x) => x !== id)
                : [...current, id];
            onChange(next);
        }
        else {
            onChange(id);
        }
    };
    const heights = {
        sm: 28,
        md: 34,
        lg: 40,
    };
    const paddings = {
        sm: 6,
        md: 8,
        lg: 10,
    };
    return (_jsxs(View, { style: style, children: [title ? (_jsx(Text, { variant: "titleSmall", style: [{ marginBottom: 6, fontWeight: "600" }, titleStyle], accessibilityRole: "header", accessibilityLabel: title, children: title })) : null, _jsx(View, { style: [styles.row, { gap, rowGap: gap }], children: options.map((opt) => {
                    var _a;
                    const selected = isSelected(opt.id);
                    return (_jsx(Chip, { icon: opt.icon, selected: selected, onPress: () => toggle(opt.id), compact: true, disabled: disabled || opt.disabled, accessibilityLabel: (_a = opt.accessibilityLabel) !== null && _a !== void 0 ? _a : opt.label, mode: "outlined", style: [
                            {
                                height: heights[size],
                                borderRadius: 12,
                                borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                            },
                        ], textStyle: {
                            fontSize: size === "sm" ? 12 : size === "md" ? 14 : 15,
                            fontWeight: "600",
                            color: theme.colors.onSurface,
                        }, selectedColor: theme.colors.onPrimaryContainer, showSelectedCheck: false, rippleColor: theme.colors.primary, 
                        // background quando selecionado
                        elevated: false, theme: {
                            colors: {
                                // @ts-ignore
                                surfaceDisabled: theme.colors.surfaceDisabled,
                                // quando selected=true, Paper usa 'secondaryContainer' como fundo do Chip (v3)
                                secondaryContainer: theme.colors.secondaryContainer,
                            },
                        }, children: opt.label }, opt.id));
                }) })] }));
};
const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
    },
});
export default ChoiceChips;
//# sourceMappingURL=choiceChips.js.map