import React from 'react';
export interface QuizProgressBarProps {
    /** Passo actual (1-based) */
    passo: number;
    /** Número total de passos/perguntas */
    total: number;
    /** Mostrar percentagem por cima?  */
    mostrarTexto?: boolean;
}
/**
 * Barra de progresso animada para o Quiz.
 */
export declare const QuizProgressBar: React.FC<QuizProgressBarProps>;
