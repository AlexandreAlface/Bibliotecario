import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Chip, Divider, Menu, useTheme, TouchableRipple, } from "react-native-paper";
/**
 * Barra de filtros com chips que abrem menus.
 * Mostra os itens selecionados como chips com X, e um Divider separando.
 */
const FilterBarAdvanced = ({ filters, value, onChange, style, chipsRowStyle, tagsRowStyle, showSelectedTags = true, accessibilityLabel = "Barra de filtros", }) => {
    const theme = useTheme();
    const [openKey, setOpenKey] = useState(null);
    const setFor = (key, next) => {
        onChange({ ...value, [key]: next });
    };
    const toggleOption = (key, optId, multiple) => {
        const current = value[key];
        if (multiple) {
            const arr = Array.isArray(current) ? current : [];
            const next = arr.includes(optId)
                ? arr.filter((x) => x !== optId)
                : [...arr, optId];
            setFor(key, next);
        }
        else {
            const next = current === optId ? undefined : optId;
            setFor(key, next);
            setOpenKey(null); // fecha em seleção simples
        }
    };
    const clearTag = (key, id) => {
        const current = value[key];
        if (Array.isArray(current)) {
            setFor(key, current.filter((x) => x !== id));
        }
        else if (current === id) {
            setFor(key, undefined);
        }
    };
    // gera tags selecionadas para exibir abaixo
    const selectedTags = useMemo(() => {
        const tags = [];
        for (const f of filters) {
            const sel = value[f.key];
            if (!sel)
                continue;
            if (Array.isArray(sel)) {
                sel.forEach((id) => {
                    const opt = f.options.find((o) => o.id === id);
                    if (opt)
                        tags.push({ key: f.key, id, label: opt.label });
                });
            }
            else {
                const opt = f.options.find((o) => o.id === sel);
                if (opt)
                    tags.push({ key: f.key, id: sel, label: opt.label });
            }
        }
        return tags;
    }, [filters, value]);
    return (_jsxs(View, { style: style, accessible: true, accessibilityLabel: accessibilityLabel, children: [_jsx(View, { style: [styles.row, styles.wrap, chipsRowStyle], children: filters.map((f) => {
                    const isOpen = openKey === f.key;
                    const selected = value[f.key];
                    // título compacto do chip quando há algo selecionado
                    const chipLabel = Array.isArray(selected) && selected.length > 0
                        ? `${f.label}`
                        : typeof selected === "string"
                            ? `${f.label}`
                            : f.label;
                    return (_jsx(Menu, { visible: isOpen, onDismiss: () => setOpenKey(null), anchor: _jsxs(Chip, { mode: "flat", onPress: () => setOpenKey(isOpen ? null : f.key), icon: f.key.includes("date") ? "calendar" : undefined, style: [
                                styles.filterChip,
                                { backgroundColor: theme.colors.primary },
                            ], textStyle: { color: theme.colors.onPrimary, fontWeight: "600" }, accessibilityLabel: `Abrir filtro ${f.label}`, selectedColor: theme.colors.onPrimary, children: [chipLabel, " ", "  ▾"] }), contentStyle: [
                            styles.menuContent,
                            { backgroundColor: theme.colors.background },
                        ], children: f.options.map((opt, idx) => {
                            const isSelected = Array.isArray(selected)
                                ? selected.includes(opt.id)
                                : selected === opt.id;
                            return (_jsx(TouchableRipple, { onPress: () => toggleOption(f.key, opt.id, f.multiple), accessibilityLabel: `${opt.label}${isSelected ? " (selecionado)" : ""}`, accessibilityRole: "menuitem", style: [
                                    styles.menuItem,
                                    isSelected && {
                                        backgroundColor: theme.colors.surfaceVariant,
                                    },
                                ], children: _jsxs(View, { style: styles.menuItemRow, children: [_jsx(Text, { style: [styles.menuItemText, { color: theme.colors.onSurface }], children: opt.label }), isSelected ? (_jsx(Text, { style: styles.menuX, accessibilityElementsHidden: true, importantForAccessibility: "no", children: "\u00D7" })) : null] }) }, opt.id));
                        }) }, f.key));
                }) }), _jsx(Divider, { style: [styles.divider, { backgroundColor: theme.colors.outlineVariant }] }), showSelectedTags ? (_jsx(View, { style: [styles.row, styles.wrap, styles.tagsRow, tagsRowStyle], children: selectedTags.map((t) => (_jsx(Chip, { mode: "flat", onClose: () => clearTag(t.key, t.id), style: [
                        styles.tagChip,
                        { backgroundColor: theme.colors.secondary },
                    ], textStyle: { color: theme.colors.onSecondary, fontWeight: "600" }, accessibilityLabel: `${t.label}. Remover filtro`, children: t.label }, `${t.key}:${t.id}`))) })) : null] }));
};
const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center" },
    wrap: { flexWrap: "wrap", gap: 10, rowGap: 10 },
    filterChip: {
        borderRadius: 999,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 8,
        width: "100%",
    },
    tagsRow: { paddingTop: 2 },
    tagChip: { borderRadius: 999 },
    menuContent: {
        borderRadius: 12,
        elevation: 6,
        paddingVertical: 6,
    },
    menuItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    menuItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    menuItemText: { fontSize: 16, fontWeight: "600" },
    menuX: { fontSize: 18, fontWeight: "800", opacity: 0.8 },
});
export default FilterBarAdvanced;
//# sourceMappingURL=FilterBarAdvanced.js.map