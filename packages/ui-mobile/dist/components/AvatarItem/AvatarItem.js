import { jsx as _jsx } from "react/jsx-runtime";
import { View } from "react-native";
import { List, Avatar, IconButton, useTheme } from "react-native-paper";
function getInitials(label) {
    var _a;
    const first = (_a = label.split(/[,\s]/).filter(Boolean)[0]) !== null && _a !== void 0 ? _a : "";
    return first.slice(0, 1).toUpperCase();
}
export const AvatarItem = ({ label, description, avatarSrc, avatarSize = 40, actions = [], accessibilityRole, onPress, ...rest }) => {
    const theme = useTheme();
    const left = () => avatarSrc ? (_jsx(Avatar.Image, { size: avatarSize, source: { uri: avatarSrc } })) : (_jsx(Avatar.Text, { size: avatarSize, label: getInitials(label), style: { backgroundColor: theme.colors.secondaryContainer }, labelStyle: { fontFamily: "Poppins_600SemiBold" } }));
    const right = () => (_jsx(View, { style: { flexDirection: "row", alignItems: "center" }, children: actions.map((a, idx) => (_jsx(IconButton, { icon: a.icon, onPress: a.onPress, disabled: a.disabled, accessibilityLabel: a.accessibilityLabel, testID: a.testID, size: 20, style: idx > 0 ? { marginLeft: 4 } : undefined }, idx))) }));
    return (_jsx(List.Item, { title: label, description: description, left: left, right: right, onPress: onPress, titleStyle: { fontFamily: "Poppins_500Medium", fontSize: 16 }, descriptionStyle: { fontFamily: "Poppins_400Regular" }, accessibilityRole: accessibilityRole !== null && accessibilityRole !== void 0 ? accessibilityRole : (onPress ? "button" : "text"), accessibilityLabel: label, ...rest }));
};
//# sourceMappingURL=AvatarItem.js.map