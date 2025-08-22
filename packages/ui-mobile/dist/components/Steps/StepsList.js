import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import StepCard from "./StepCard";
const StepsList = ({ steps, spacing = 24, horizontalPadding = 16, maxWidth = 720, style, }) => {
    useTheme(); // mantém compatibilidade de tema; sem leituras diretas aqui
    return (_jsx(View, { style: [
            styles.container,
            {
                paddingHorizontal: horizontalPadding,
                rowGap: spacing,
                alignSelf: "center",
                width: "100%",
                maxWidth,
            },
            style,
        ], 
        // alguns RN não suportam "list" — deixa sem role
        // accessibilityRole="list"
        accessibilityLabel: "Como funciona", children: steps.map((s) => {
            var _a;
            return (_jsx(View, { 
                // "listitem" não é suportado em várias versões; usa "text" (ou remove)
                accessibilityRole: "text", children: _jsx(StepCard, { ...s, elevation: (_a = s.elevation) !== null && _a !== void 0 ? _a : 1 }) }, s.step));
        }) }));
};
const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
});
export default StepsList;
//# sourceMappingURL=StepsList.js.map