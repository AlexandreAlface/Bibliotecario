import * as React from "react";
import { ViewStyle } from "react-native";
import { TextInput } from "react-native-paper";
export type TextFieldProps = React.ComponentProps<typeof TextInput> & {
    /** ocupa 100% da largura do container */
    fullWidth?: boolean;
    /** estilo extra do input */
    style?: ViewStyle | ViewStyle[];
};
export declare function TextField({ fullWidth, style, outlineColor, activeOutlineColor, ...props }: TextFieldProps): import("react/jsx-runtime").JSX.Element;
