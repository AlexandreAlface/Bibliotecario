import * as React from "react";
import { Button as PaperButton } from "react-native-paper";
type PaperBtnProps = React.ComponentProps<typeof PaperButton>;
type CommonProps = Omit<PaperBtnProps, "mode" | "children"> & {
    label: string;
    fullWidth?: boolean;
    compact?: boolean;
};
export declare function PrimaryButton({ label, style, contentStyle, labelStyle, fullWidth, compact, ...rest }: CommonProps): import("react/jsx-runtime").JSX.Element;
export declare function SecondaryButton({ label, style, contentStyle, labelStyle, fullWidth, compact, ...rest }: CommonProps): import("react/jsx-runtime").JSX.Element;
export {};
