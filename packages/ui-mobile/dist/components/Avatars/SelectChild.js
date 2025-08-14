import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import { Text, Menu, Divider, TouchableRipple, useTheme, } from "react-native-paper";
const getInitials = (name) => name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const AvatarBubble = ({ size = 28, uri, initials, }) => {
    if (uri) {
        return (_jsx(Image, { source: { uri }, style: { width: size, height: size, borderRadius: size / 2 } }));
    }
    return (_jsx(View, { style: {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#D1D5DB",
            alignItems: "center",
            justifyContent: "center",
        }, children: _jsx(Text, { style: { fontSize: 12, fontWeight: "700", color: "#424242" }, children: initials }) }));
};
const SelectChild = ({ label = "Selecionar criança", placeholder = "Selecionar criança", value, options, onChange, disabled, menuMaxHeight = 320, anchorTestID, accessibilityLabel, anchorPosition = "bottom", }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [anchorWidth, setAnchorWidth] = useState();
    const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);
    const onAnchorLayout = (e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (!anchorWidth || Math.abs(anchorWidth - w) > 1)
            setAnchorWidth(w);
    };
    const selectedInitials = selected ? getInitials(selected.name) : undefined;
    return (_jsxs(View, { accessible: true, accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : label, children: [_jsx(Text, { style: styles.fieldLabel, children: label }), _jsx(Menu, { visible: open, onDismiss: () => setOpen(false), anchorPosition: anchorPosition, anchor: _jsx(TouchableRipple, { disabled: disabled, onLayout: onAnchorLayout, onPress: () => setOpen((v) => !v), testID: anchorTestID, accessibilityLabel: selected
                        ? `${label}. Selecionado: ${selected.name}. Tocar para alterar.`
                        : `${label}. Nenhum selecionado. Tocar para abrir.`, style: [
                        styles.anchor,
                        {
                            borderBottomColor: disabled
                                ? theme.colors.surfaceVariant
                                : theme.colors.primary,
                            opacity: disabled ? 0.6 : 1,
                        },
                    ], children: _jsxs(View, { style: styles.anchorRow, children: [selected ? (_jsxs(_Fragment, { children: [_jsx(AvatarBubble, { size: 28, uri: selected.avatarUri, initials: selectedInitials }), _jsx(Text, { numberOfLines: 1, style: [styles.anchorText, { color: theme.colors.onSurface }], children: selected.name })] })) : (_jsx(Text, { numberOfLines: 1, style: [styles.anchorText, { color: theme.colors.primary }], children: placeholder })), _jsx(Text, { accessibilityElementsHidden: true, importantForAccessibility: "no", style: styles.chevron, children: "\u25BE" })] }) }), contentStyle: [
                    styles.menuContent,
                    {
                        width: anchorWidth,
                        maxHeight: menuMaxHeight,
                        backgroundColor: theme.colors.background,
                    },
                ], style: styles.menuOuter, children: options.map((opt, idx) => {
                    const initials = getInitials(opt.name);
                    const isLast = idx === options.length - 1;
                    return (_jsxs(React.Fragment, { children: [_jsx(Menu.Item, { accessibilityLabel: `Selecionar ${opt.name}`, leadingIcon: () => (_jsx(AvatarBubble, { size: 32, uri: opt.avatarUri, initials: initials })), title: opt.name, onPress: () => {
                                    onChange(opt.id);
                                    setOpen(false);
                                }, titleStyle: styles.itemTitle, style: styles.menuItem }), !isLast && _jsx(Divider, {})] }, opt.id));
                }) })] }));
};
const styles = StyleSheet.create({
    fieldLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 6,
        color: "#1B5E20",
    },
    anchor: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 2,
    },
    anchorRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    anchorText: {
        fontSize: 16,
        fontWeight: "500",
        marginLeft: 10,
        flex: 1,
    },
    chevron: {
        marginLeft: 8,
        fontSize: 16,
        opacity: 0.7,
    },
    menuOuter: {},
    menuContent: {
        borderRadius: 14,
        elevation: 6,
    },
    menuItem: {
        paddingVertical: 10,
    },
    itemTitle: {
        fontSize: 16,
    },
});
export default SelectChild;
//# sourceMappingURL=SelectChild.js.map