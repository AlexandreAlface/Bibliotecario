import * as React from "react";
import { Button as PaperButton } from "react-native-paper";
type PaperBtnProps = React.ComponentProps<typeof PaperButton>;
type CommonProps = Omit<PaperBtnProps, "mode"> & {
    /** texto opcional se não quiseres usar children */
    label?: string;
    /** ocupa 100% da largura do container */
    fullWidth?: boolean;
};
export declare const PrimaryButton: React.FC<CommonProps>;
export declare const SecondaryButton: React.FC<CommonProps>;
export {};
