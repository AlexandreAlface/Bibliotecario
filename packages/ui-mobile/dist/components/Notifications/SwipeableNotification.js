import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
const SwipeableNotification = ({ item, onDelete }) => {
    const theme = useTheme();
    // Botão visível ao arrastar para o lado
    const renderRightActions = () => (_jsx(View, { style: styles.rightAction, children: _jsx(IconButton, { icon: "delete", iconColor: "#fff", size: 20, onPress: () => onDelete(item.id) }) }));
    return (_jsx(Swipeable, { renderRightActions: renderRightActions, children: _jsxs(View, { style: styles.container, children: [_jsx(Text, { variant: "titleSmall", style: styles.title, children: item.title }), item.subtitle && (_jsx(Text, { variant: "bodySmall", style: { color: theme.colors.onSurfaceVariant }, children: item.subtitle }))] }) }));
};
const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#ddd",
    },
    title: {
        fontWeight: "600",
    },
    rightAction: {
        backgroundColor: "#e74c3c",
        justifyContent: "center",
        alignItems: "center",
        width: 64,
    },
});
export default SwipeableNotification;
//# sourceMappingURL=SwipeableNotification.js.map