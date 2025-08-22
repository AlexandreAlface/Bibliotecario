import React from "react";
import { ViewStyle, TextStyle } from "react-native";
export type InlineCheckOption = {
    id: string;
    label: string;
    disabled?: boolean;
    accessibilityLabel?: string;
};
export interface InlineCheckListProps {
    /** Título acima das opções (ex.: "Géneros") */
    title?: string;
    /** Opções listadas */
    options: InlineCheckOption[];
    /** Valor selecionado (múltipla seleção) */
    value?: string[];
    /** Callback de alteração */
    onChange?: (next: string[]) => void;
    /** Cor do “badge” de check quando selecionado */
    checkColor?: string;
    /** Tamanho do badge (largura/altura) */
    checkSize?: number;
    /** Espaço entre itens */
    gap?: number;
    /** Estilos extras */
    style?: ViewStyle;
    titleStyle?: TextStyle;
    itemTextStyle?: TextStyle;
}
declare const InlineCheckList: React.FC<InlineCheckListProps>;
export default InlineCheckList;
