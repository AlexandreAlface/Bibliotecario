import React from "react";
import { ImageSourcePropType, ViewStyle, TextStyle } from "react-native";
export type ChipOption = {
    id: string;
    label: string;
    /** opcional: ícone do Paper (ex.: "baby") ou imagem */
    icon?: string | ImageSourcePropType;
    disabled?: boolean;
    accessibilityLabel?: string;
};
export interface ChoiceChipsProps {
    /** Título acima dos chips (ex.: "Faixa Etária") */
    title?: string;
    /** Opções */
    options: ChipOption[];
    /** Seleção atual (string para simples, string[] para múltipla) */
    value?: string | string[];
    /** Controla se é múltipla escolha */
    multiple?: boolean;
    /** Callback ao mudar */
    onChange?: (value: string | string[]) => void;
    /** Densidade/altura do chip */
    size?: "sm" | "md" | "lg";
    /** Espaçamento entre chips */
    gap?: number;
    /** Estilo extra */
    style?: ViewStyle;
    titleStyle?: TextStyle;
    /** Desabilitar tudo */
    disabled?: boolean;
}
declare const ChoiceChips: React.FC<ChoiceChipsProps>;
export default ChoiceChips;
