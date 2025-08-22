import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { View, StyleSheet, Image, Animated, Dimensions, } from "react-native";
import { Surface, Text, TouchableRipple, useTheme, } from "react-native-paper";
const AnimatedRipple = ({ onPress, disabled, children, style, accessibilityLabel, selected }) => {
    var _a;
    const scale = React.useRef(new Animated.Value(1)).current;
    const pressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    return (_jsx(Animated.View, { style: [{ transform: [{ scale }] }, style], children: _jsx(TouchableRipple, { onPress: onPress, disabled: disabled, onPressIn: pressIn, onPressOut: pressOut, accessibilityRole: "button", accessibilityLabel: accessibilityLabel, accessibilityState: { disabled, selected }, borderless: false, style: { borderRadius: (_a = style === null || style === void 0 ? void 0 : style.borderRadius) !== null && _a !== void 0 ? _a : 16 }, children: _jsx(View, { children: children }) }) }));
};
const defaultCols = () => {
    const w = Dimensions.get("window").width;
    if (w >= 900)
        return 5;
    if (w >= 700)
        return 4;
    if (w >= 480)
        return 3;
    return 2;
};
const QuestionChoices = ({ question, options, visibleCount, multiple = false, value, onChange, columns, itemMinHeight = 84, gap = 16, style, itemStyle, itemTextStyle, itemRadius = 16, }) => {
    const theme = useTheme();
    const colCount = columns !== null && columns !== void 0 ? columns : defaultCols();
    const data = useMemo(() => (typeof visibleCount === "number" ? options.slice(0, visibleCount) : options), [options, visibleCount]);
    const isSelected = (id) => {
        if (multiple)
            return Array.isArray(value) && value.includes(id);
        return value === id;
    };
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
    // largura por coluna em %, tipada corretamente como template literal
    const pct = 100 / colCount;
    const itemWidth = `${pct}%`;
    return (_jsxs(View, { style: style, children: [_jsx(Surface, { elevation: 2, style: [
                    styles.pill,
                    {
                        backgroundColor: theme.colors.surfaceVariant,
                        shadowColor: "#000",
                    },
                ], accessibilityRole: "header", accessibilityLabel: question, children: _jsx(Text, { variant: "titleMedium", style: [styles.pillText, { color: theme.colors.primary }], children: question }) }), _jsx(View, { style: [
                    styles.grid,
                    { gap, marginTop: gap, rowGap: gap },
                ], children: data.map((opt) => {
                    var _a;
                    const selected = isSelected(opt.id);
                    return (_jsx(Surface, { elevation: selected ? 4 : 2, style: [
                            styles.item,
                            {
                                minHeight: itemMinHeight,
                                borderRadius: itemRadius,
                                width: itemWidth, // <-- agora tipado como `${number}%`
                                backgroundColor: selected
                                    ? theme.colors.secondaryContainer
                                    : theme.colors.surface,
                            },
                            itemStyle,
                        ], children: _jsx(AnimatedRipple, { onPress: () => toggle(opt.id), disabled: opt.disabled, selected: selected, accessibilityLabel: (_a = opt.accessibilityLabel) !== null && _a !== void 0 ? _a : `${opt.label}. ${selected ? "Selecionado" : "Não selecionado"}`, style: { borderRadius: itemRadius }, children: _jsxs(View, { style: styles.itemContent, children: [opt.image ? (_jsx(Image, { source: opt.image, style: [
                                            styles.image,
                                            { borderRadius: itemRadius - 6 },
                                        ], resizeMode: "cover", accessible: false })) : null, _jsx(Text, { variant: "titleSmall", numberOfLines: 2, style: [
                                            styles.itemLabel,
                                            itemTextStyle,
                                            { color: theme.colors.onSurface },
                                        ], children: opt.label })] }) }) }, opt.id));
                }) })] }));
};
const styles = StyleSheet.create({
    pill: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        // sem overflow: hidden para manter sombra no Android
    },
    pillText: {
        fontWeight: "700",
        textAlign: "center",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    item: {
    // elevation no Surface já cria sombra
    },
    itemContent: {
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    image: {
        width: "100%",
        aspectRatio: 1,
    },
    itemLabel: {
        textAlign: "center",
    },
});
export default QuestionChoices;
//# sourceMappingURL=QuestionChoices.js.map