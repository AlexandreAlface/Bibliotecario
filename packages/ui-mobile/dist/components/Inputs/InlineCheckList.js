import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet, } from "react-native";
import { Text, TouchableRipple, useTheme, Surface, } from "react-native-paper";
const InlineItem = ({ label, selected, disabled, onPress, checkColor, checkSize, textStyle, accessibilityLabel, }) => {
    const theme = useTheme();
    return (_jsx(TouchableRipple, { onPress: onPress, disabled: disabled, accessibilityRole: "checkbox", accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : label, accessibilityState: { checked: selected, disabled }, style: styles.touchHit, rippleColor: theme.colors.primary, borderless: true, children: _jsxs(View, { style: styles.inlineRow, children: [_jsx(Text, { variant: "titleSmall", style: [
                        { color: theme.colors.onSurface },
                        textStyle,
                        disabled && { opacity: 0.6 },
                    ], children: label }), _jsx(Surface, { elevation: selected ? 1 : 0, style: [
                        styles.check,
                        {
                            width: checkSize,
                            height: checkSize,
                            borderRadius: 6,
                            marginLeft: 6,
                            borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                            borderColor: theme.colors.outlineVariant,
                            backgroundColor: selected ? checkColor : theme.colors.surface,
                        },
                    ], accessibilityElementsHidden: true, importantForAccessibility: "no", children: selected ? (_jsx(Text, { style: styles.tick, children: "\u2713" })) : null })] }) }));
};
const InlineCheckList = ({ title, options, value = [], onChange, checkColor = "#7AC943", // verde semelhante ao do print
checkSize = 18, gap = 14, style, titleStyle, itemTextStyle, }) => {
    const theme = useTheme();
    const toggle = (id) => {
        if (!onChange)
            return;
        const next = value.includes(id)
            ? value.filter((x) => x !== id)
            : [...value, id];
        onChange(next);
    };
    return (_jsxs(View, { style: style, children: [title ? (_jsx(Text, { variant: "titleSmall", style: [{ marginBottom: 6, fontWeight: "600" }, titleStyle], accessibilityRole: "header", accessibilityLabel: title, children: title })) : null, _jsx(View, { style: [styles.wrap, { gap, rowGap: gap }], children: options.map((opt) => (_jsx(InlineItem, { label: opt.label, selected: value.includes(opt.id), disabled: opt.disabled, onPress: () => toggle(opt.id), checkColor: checkColor, checkSize: checkSize, textStyle: itemTextStyle, accessibilityLabel: opt.accessibilityLabel }, opt.id))) })] }));
};
const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
    },
    inlineRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    touchHit: {
        paddingVertical: 4,
        paddingRight: 2,
    },
    check: {
        alignItems: "center",
        justifyContent: "center",
    },
    tick: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "800",
        lineHeight: 12,
    },
});
export default InlineCheckList;
//# sourceMappingURL=InlineCheckList.js.map