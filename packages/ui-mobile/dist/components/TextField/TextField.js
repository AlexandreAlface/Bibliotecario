import { jsx as _jsx } from "react/jsx-runtime";
import { StyleSheet } from "react-native";
import { TextInput, useTheme } from "react-native-paper";
export function TextField({ fullWidth = true, style, outlineColor, activeOutlineColor, ...props }) {
    const theme = useTheme();
    return (_jsx(TextInput, { mode: "outlined", outlineColor: outlineColor !== null && outlineColor !== void 0 ? outlineColor : theme.colors.outline /* visível parado */, activeOutlineColor: activeOutlineColor !== null && activeOutlineColor !== void 0 ? activeOutlineColor : theme.colors.primary /* focado */, style: [styles.input, fullWidth && styles.fullWidth, style], 
        // em RN Paper 5 dá para controlar a borda diretamente:
        outlineStyle: { borderRadius: 16, borderWidth: 2 }, theme: { roundness: 16 }, ...props }));
}
const styles = StyleSheet.create({
    fullWidth: { alignSelf: "stretch" },
    input: {
        backgroundColor: "#fff", // destaca no gradient
    },
});
//# sourceMappingURL=TextField.js.map