import React from "react";
import { ViewStyle } from "react-native";
export interface ProgressBarProps {
    /** Valor entre 0 e 1 */
    progress: number;
    /** Cor da barra (por padrão usa `theme.colors.primary`) */
    color?: string;
    /** Altura da barra */
    height?: number;
    /** Cor de fundo da barra */
    backgroundColor?: string;
    /** Bordas arredondadas */
    borderRadius?: number;
    /** Estilo adicional do container */
    style?: ViewStyle;
    /** Duração da animação (ms) */
    animationDuration?: number;
}
declare const ProgressBar: React.FC<ProgressBarProps>;
export default ProgressBar;
