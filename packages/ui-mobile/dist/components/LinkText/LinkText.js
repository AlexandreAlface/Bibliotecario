import { jsx as _jsx } from "react/jsx-runtime";
import { Linking, Pressable } from "react-native";
import { Text as PaperText, useTheme } from "react-native-paper";
const mapSize = { xs: 12, sm: 14, md: 16, lg: 18 };
export function LinkText({ href, onPress, underline = true, align = "left", size = "md", style, children, ...rest }) {
    const theme = useTheme();
    const handlePress = async () => {
        if (onPress)
            return onPress();
        if (!href)
            return;
        const ok = await Linking.canOpenURL(href);
        if (ok)
            Linking.openURL(href);
    };
    return (_jsx(Pressable, { onPress: handlePress, children: _jsx(PaperText, { ...rest, style: [
                { color: theme.colors.primary, textAlign: align, textDecorationLine: underline ? "underline" : "none" },
                { fontSize: mapSize[size] },
                style,
            ], children: children }) }));
}
//# sourceMappingURL=LinkText.js.map