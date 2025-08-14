import * as React from "react";
import { ViewStyle } from "react-native";
export type TextIconButtonProps = {
    /** Texto a mostrar */
    label: string;
    /** Nome do ícone do Paper (ex.: "account-plus") */
    icon: string;
    /** Callback ao clicar */
    onPress?: () => void;
    /** Variante visual: 'solid' (com fundo) ou 'ghost' (sem fundo) */
    variant?: "solid" | "ghost";
    /** Cor de fundo quando variant = 'solid' (default: theme.colors.primary) */
    backgroundColor?: string;
    /** Cor do texto/ícone (default: onPrimary em 'solid' e primary em 'ghost') */
    color?: string;
    /** Tamanho do ícone (default: 20) */
    iconSize?: number;
    /** Posição do ícone */
    iconPosition?: "left" | "right";
    /** Desativado */
    disabled?: boolean;
    /** Estilo extra para o container */
    style?: ViewStyle;
    /** Accessibility label opcional */
    accessibilityLabel?: string;
};
declare const TextIconButton: React.FC<TextIconButtonProps>;
export default TextIconButton;
