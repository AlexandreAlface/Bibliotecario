import React from 'react';
import { SxProps, Theme } from '@mui/material';
export type Option = {
    value: string | number;
    label: React.ReactNode;
};
export interface SelectableOptionsProps {
    /** Título/legenda do grupo (opcional) */
    label?: string;
    /** Lista de opções */
    options: Option[];
    /** Valor(es) selecionado(s) */
    value: string | number | (string | number)[];
    /** Callback de alteração */
    onChange: (value: string | number | (string | number)[]) => void;
    /** Tipo de controlo */
    variant?: 'checkbox' | 'radio';
    /** Disposição horizontal ou vertical */
    row?: boolean;
    /** Estilos adicionais */
    sx?: SxProps<Theme>;
}
export declare const SelectableOptions: React.FC<SelectableOptionsProps>;
