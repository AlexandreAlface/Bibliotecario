import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet, Pressable } from "react-native";
import { Avatar, Icon, useTheme, Surface } from "react-native-paper";
const AvatarPicture = ({ uri, initials, fallbackIcon = "account", size = 96, rounded = true, showBorder = false, borderColor, onPress, accessibilityLabel, style, }) => {
    const theme = useTheme();
    const radius = rounded ? size / 2 : theme.roundness;
    const borderStyle = showBorder
        ? { borderWidth: 1, borderColor: borderColor !== null && borderColor !== void 0 ? borderColor : theme.colors.outlineVariant }
        : null;
    const content = (() => {
        if (uri) {
            return _jsx(Avatar.Image, { size: size, source: { uri } });
        }
        if (initials) {
            return _jsx(Avatar.Text, { size: size, label: initials });
        }
        return (_jsx(Surface, { style: [
                styles.fallback,
                { width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.surfaceVariant },
            ], elevation: 0, children: _jsx(Icon, { source: fallbackIcon, size: Math.max(20, size * 0.35), color: theme.colors.onSurfaceVariant }) }));
    })();
    const Container = onPress ? Pressable : View;
    return (_jsx(Container, { onPress: onPress, accessibilityRole: onPress ? "button" : "image", accessibilityLabel: accessibilityLabel !== null && accessibilityLabel !== void 0 ? accessibilityLabel : "Avatar", style: [
            {
                width: size,
                height: size,
                borderRadius: radius,
                overflow: "hidden",
            },
            borderStyle,
            style,
        ], children: content }));
};
const styles = StyleSheet.create({
    fallback: {
        alignItems: "center",
        justifyContent: "center",
    },
});
export default AvatarPicture;
//# sourceMappingURL=AvatarPicture.js.map