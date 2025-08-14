import * as React from "react";
import { ViewStyle } from "react-native";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";
/**
 * Cartão de passo (Step) com um círculo destacado no topo a mostrar o número do passo.
 * Ideal para onboarding/explicações de fluxo.
 *
 * Acessibilidade:
 * - O container tem role="summary" e label com "Passo X: Título".
 */
export type StepCardProps = {
    /** Número do passo exibido no círculo. */
    step: number;
    /** Título do passo. */
    title: string;
    /** Descrição opcional por baixo do título. */
    description?: string;
    /** Cor do círculo/acento (default: theme.colors.primary). */
    accentColor?: string;
    /** Cor de fundo suave do cartão (default: tonalidade do tema). */
    backgroundColor?: string;
    /** Diâmetro do círculo (default: 64). */
    circleSize?: number;
    /** Elevação do cartão (0–5, default: 1). */
    elevation?: MD3Elevation;
    /** Estilo extra do wrapper externo. */
    style?: ViewStyle;
    /** Accessibility label opcional. */
    accessibilityLabel?: string;
};
declare const StepCard: React.FC<StepCardProps>;
export default StepCard;
