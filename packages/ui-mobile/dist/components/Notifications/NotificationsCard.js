import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Surface, Text, useTheme, List, IconButton, Divider, ActivityIndicator, } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
const ACTION_WIDTH = 64;
const NotificationsCard = ({ items, headerTitle = "Notificações", onItemPress, onItemDelete, onClearAll, loading = false, emptyText = "Sem notificações", maxHeight = 320, elevation = 2, style, swipeToDelete = false, }) => {
    const theme = useTheme();
    const renderRightActions = (progress, item, close) => {
        return (_jsx(View, { style: [
                styles.action,
                { backgroundColor: theme.colors.error, width: ACTION_WIDTH },
            ], children: _jsx(IconButton, { icon: "delete", accessibilityLabel: `Apagar "${item.title}"`, iconColor: theme.colors.onError, onPress: () => {
                    close === null || close === void 0 ? void 0 : close();
                    onItemDelete === null || onItemDelete === void 0 ? void 0 : onItemDelete(item);
                } }) }));
    };
    const Row = ({ item, last, }) => {
        var _a;
        const swipeRef = React.useRef(null);
        const content = (_jsxs(View, { children: [_jsx(List.Item, { title: item.title, description: item.subtitle, onPress: onItemPress ? () => onItemPress(item) : undefined, accessibilityRole: onItemPress ? "button" : "text", accessibilityLabel: (_a = item.accessibilityLabel) !== null && _a !== void 0 ? _a : [item.title, item.subtitle].filter(Boolean).join(". "), titleStyle: {
                        fontWeight: "700",
                        color: item.read ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                    }, descriptionStyle: { color: theme.colors.onSurfaceVariant }, left: item.leftIcon ? (props) => _jsx(List.Icon, { ...props, icon: item.leftIcon }) : undefined, right: onItemDelete && !swipeToDelete
                        ? () => (_jsx(IconButton, { icon: "delete-outline", onPress: () => onItemDelete(item), accessibilityLabel: `Apagar "${item.title}"` }))
                        : undefined }), !last && _jsx(Divider, {})] }));
        if (swipeToDelete && onItemDelete) {
            return (_jsx(Swipeable, { ref: swipeRef, friction: 2, rightThreshold: 28, renderRightActions: (progress) => renderRightActions(progress, item, () => { var _a; return (_a = swipeRef.current) === null || _a === void 0 ? void 0 : _a.close(); }), onSwipeableOpen: () => {
                    // se quiseres apagar automaticamente ao abrir:
                    // onItemDelete(item); swipeRef.current?.close();
                }, children: content }));
        }
        return content;
    };
    return (_jsx(Surface, { elevation: elevation, style: [styles.container, { backgroundColor: theme.colors.surface }, style], accessibilityRole: "summary", accessibilityLabel: `${headerTitle}. ${items.length ? `${items.length} itens.` : "Sem notificações."}`, children: _jsxs(View, { style: [styles.clip, { borderRadius: 16 }], children: [_jsx(View, { style: styles.header, children: _jsx(Text, { variant: "titleMedium", style: { fontWeight: "700" }, children: headerTitle }) }), _jsx(Divider, {}), _jsx(View, { style: { maxHeight }, children: loading ? (_jsx(View, { style: styles.loading, children: _jsx(ActivityIndicator, { accessibilityLabel: "A carregar notifica\u00E7\u00F5es" }) })) : items.length === 0 ? (_jsx(View, { style: styles.empty, children: _jsx(Text, { variant: "bodyMedium", style: { color: theme.colors.onSurfaceVariant }, children: emptyText }) })) : (_jsx(ScrollView, { showsVerticalScrollIndicator: true, contentContainerStyle: { paddingVertical: 4 }, children: items.map((it, idx) => (_jsx(Row, { item: it, last: idx === items.length - 1 }, it.id))) })) }), _jsx(Divider, {}), _jsx(View, { style: styles.footer, children: _jsx(Text, { variant: "titleSmall", onPress: onClearAll, accessibilityRole: "button", accessibilityLabel: "Limpar todas as notifica\u00E7\u00F5es", style: { color: theme.colors.primary, fontWeight: "600", textAlign: "center" }, children: "Limpar todas" }) })] }) }));
};
const styles = StyleSheet.create({
    container: {
        width: 320,
        borderRadius: 16,
    },
    clip: { overflow: "hidden" },
    header: { paddingHorizontal: 16, paddingVertical: 12 },
    footer: { paddingHorizontal: 16, paddingVertical: 12 },
    loading: { height: 160, alignItems: "center", justifyContent: "center" },
    empty: { paddingVertical: 24, alignItems: "center", justifyContent: "center" },
    action: {
        alignItems: "center",
        justifyContent: "center",
    },
});
export default NotificationsCard;
//# sourceMappingURL=NotificationsCard.js.map