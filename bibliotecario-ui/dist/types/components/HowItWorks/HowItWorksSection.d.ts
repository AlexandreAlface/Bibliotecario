import React from 'react';
import { InfoStepCardProps } from '../StepCard/InfoStepCard';
export interface HowItWorksSectionProps {
    /**
     * Lista de passos a apresentar.
     * Cada item é simplesmente o conjunto de props de <InfoStepCard />.
     */
    steps: InfoStepCardProps[];
    /**
     * Direcção dos cartões.
     * - 'vertical' (por defeito) = empilhados
     * - 'horizontal' = lado-a-lado
     */
    orientation?: 'vertical' | 'horizontal';
    /**
     * Espaço entre cartões em unidades de theme.spacing (default 6 = 48 px)
     */
    spacing?: number;
    /**
     * Sx extra para o <Stack />
     */
    sx?: object;
}
export declare const HowItWorksSection: React.FC<HowItWorksSectionProps>;
