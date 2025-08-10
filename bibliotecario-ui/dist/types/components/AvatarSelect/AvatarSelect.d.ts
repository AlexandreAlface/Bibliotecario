import React from 'react';
export interface ChildOption {
    id: string;
    nome: string;
    avatar?: string;
}
export interface AvatarSelectProps {
    label: string;
    options: ChildOption[];
    value: string | '';
    onChange: (id: string) => void;
    disabled?: boolean;
    /** ReactNode para o avatar de placeholder (default ícone pessoa) */
    placeholderAvatar?: React.ReactNode;
    /** Largura mínima, útil em <Stack spacing> */
    minWidth?: number | string;
}
export declare const AvatarSelect: React.FC<AvatarSelectProps>;
