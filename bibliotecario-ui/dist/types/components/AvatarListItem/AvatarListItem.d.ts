import React from 'react';
import { SxProps, Theme } from '@mui/material';
export interface Action {
    /** Ícone a renderizar dentro do IconButton */
    icon: React.ReactNode;
    /** Tooltip opcional */
    tooltip?: string;
    /** Callback */
    onClick?: () => void;
    /** Desabilitar botão? */
    disabled?: boolean;
}
export interface AvatarListItemProps {
    avatarSrc?: string;
    /** Texto principal (ex.: "Camila, 7 anos") */
    label: React.ReactNode;
    /** Lista de acções à direita */
    actions?: Action[];
    /** Tamanho do avatar (px) */
    avatarSize?: number;
    /** Estilos extra */
    sx?: SxProps<Theme>;
}
export declare const AvatarListItem: React.FC<AvatarListItemProps>;
