import * as React from "react";
import { Text as PaperText } from "react-native-paper";
type PaperTextProps = React.ComponentProps<typeof PaperText>;
type Size = "xs" | "sm" | "md" | "lg";
export type LinkTextProps = Omit<PaperTextProps, "onPress"> & {
    href?: string;
    onPress?: () => void;
    underline?: boolean;
    align?: "left" | "center" | "right";
    size?: Size;
};
export declare function LinkText({ href, onPress, underline, align, size, style, children, ...rest }: LinkTextProps): import("react/jsx-runtime").JSX.Element;
export {};
