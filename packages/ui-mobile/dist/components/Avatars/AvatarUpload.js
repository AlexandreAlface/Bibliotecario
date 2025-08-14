import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { IconButton, Surface, HelperText, useTheme, ActivityIndicator, } from "react-native-paper";
import AvatarPicture from "./AvatarPicture";
const AvatarUpload = ({ onPick, actionIcon = "camera", actionSize = 24, actionPosition = "bottom-right", actionOffset, // novo
disabled = false, loading = false, helperText, containerStyle, size = 96, ...avatarProps }) => {
    const theme = useTheme();
    // offset padrão proporcional ao tamanho; permite override (incl. negativo)
    const offset = actionOffset !== null && actionOffset !== void 0 ? actionOffset : Math.round(size * 0.08);
    const posStyle = positionToStyle(actionPosition, offset);
    return (_jsxs(View, { style: [{ alignItems: "center" }, containerStyle], children: [_jsxs(View, { style: { width: size, height: size }, children: [_jsx(AvatarPicture, { size: size, ...avatarProps }), loading && (_jsx(View, { style: [StyleSheet.absoluteFill, styles.center], children: _jsx(ActivityIndicator, { accessibilityLabel: "A carregar avatar" }) })), _jsx(Surface, { elevation: 2, style: [
                            styles.fab,
                            posStyle,
                            {
                                borderRadius: 999,
                                backgroundColor: theme.colors.surface,
                                opacity: disabled ? 0.6 : 1,
                            },
                        ], accessibilityElementsHidden: true, importantForAccessibility: "no", pointerEvents: "box-none", children: _jsx(IconButton, { icon: actionIcon, size: actionSize, onPress: onPick, disabled: disabled || loading, accessibilityLabel: "Alterar fotografia" }) })] }), !!helperText && (_jsx(HelperText, { type: "info", visible: true, style: { marginTop: 6 }, children: helperText }))] }));
};
function positionToStyle(position, offset) {
    const base = { position: "absolute" };
    // suporta offset negativo (para “sair” do avatar)
    switch (position) {
        case "bottom-right":
            return { ...base, right: offset, bottom: offset };
        case "bottom-left":
            return { ...base, left: offset, bottom: offset };
        case "top-right":
            return { ...base, right: offset, top: offset };
        case "top-left":
            return { ...base, left: offset, top: offset };
        default:
            return { ...base, right: offset, bottom: offset };
    }
}
const styles = StyleSheet.create({
    fab: { position: "absolute" },
    center: { alignItems: "center", justifyContent: "center" },
});
export default AvatarUpload;
//# sourceMappingURL=AvatarUpload.js.map