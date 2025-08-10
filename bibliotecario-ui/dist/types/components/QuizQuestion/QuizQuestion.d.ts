import React from 'react';
import { SxProps, Theme } from '@mui/material';
export interface QuizOption {
    label: string;
    value: string | number;
}
export interface QuizQuestionProps {
    pergunta: string;
    opcoes: QuizOption[];
    valor?: QuizOption['value'];
    onChange?: (valor: QuizOption['value']) => void;
    topoIcon?: React.ReactNode;
    sx?: SxProps<Theme>;
}
export declare const QuizQuestion: React.FC<QuizQuestionProps>;
