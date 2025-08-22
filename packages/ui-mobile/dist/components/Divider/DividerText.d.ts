import * as React from "react";
import { ViewStyle } from "react-native";
/**
 * Um divisor horizontal que pode opcionalmente exibir um texto centralizado.
 * Útil para separar secções visuais ou indicar alternativas (ex.: "Ou").
 */
export type DividerTextProps = {
    /** Texto opcional a mostrar no centro do divisor */
    label?: string;
    /** Espaço vertical (em px) acima/abaixo do divisor */
    spacing?: number;
    /** Cor do divisor (default: theme.colors.outlineVariant) */
    color?: string;
    /** Estilo extra para o container */
    style?: ViewStyle;
};
declare const DividerText: React.FC<DividerTextProps>;
export default DividerText;
