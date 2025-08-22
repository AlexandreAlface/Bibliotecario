import React from "react";
import { ViewStyle } from "react-native";
/**
 * Grupo de botões de rádio com Paper, com opção de indicador "circle" (bolinha)
 * para harmonizar o visual no iOS.
 */
export type RadioOption = {
    label: string;
    value: string;
    disabled?: boolean;
    accessibilityLabel?: string;
};
export type RadioOptionGroupProps = {
    label?: string;
    options: RadioOption[];
    value?: string;
    onChange?: (newValue: string) => void;
    orientation?: "horizontal" | "vertical";
    disabled?: boolean;
    loading?: boolean;
    required?: boolean;
    helperText?: string;
    errorText?: string;
    elevated?: boolean;
    /** Tipo de indicador do rádio. "paper" usa <RadioButton /> do Paper; "circle" usa bolinha custom. */
    indicator?: "paper" | "circle";
    testID?: string;
    accessibilityLabel?: string;
    style?: ViewStyle;
    textColor?: string;
};
export declare const RadioOptionGroup: React.FC<RadioOptionGroupProps>;
export default RadioOptionGroup;
