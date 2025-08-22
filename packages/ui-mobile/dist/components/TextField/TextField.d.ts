import * as React from "react";
import { ViewStyle } from "react-native";
import { TextInput } from "react-native-paper";
export type TextFieldVariant = "default" | "email" | "number" | "password";
export type TextFieldProps = React.ComponentProps<typeof TextInput> & {
    fullWidth?: boolean;
    style?: ViewStyle | ViewStyle[];
    helperText?: string;
    variant?: TextFieldVariant;
};
export declare function TextField({ fullWidth, style, secureTextEntry, right, left, onFocus, onBlur, helperText, variant, autoCapitalize, keyboardType, error, ...props }: TextFieldProps): import("react/jsx-runtime").JSX.Element;
export default TextField;
