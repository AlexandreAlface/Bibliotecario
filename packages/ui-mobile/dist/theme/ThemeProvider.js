import { jsx as _jsx } from "react/jsx-runtime";
import { Provider as PaperProvider } from "react-native-paper";
import { lightTheme, darkTheme } from "./theme";
export function ThemeProvider({ dark, children, }) {
    return (_jsx(PaperProvider, { theme: dark ? darkTheme : lightTheme, children: children }));
}
//# sourceMappingURL=ThemeProvider.js.map