import React from 'react';
import { SxProps, Theme } from '@mui/material';
export interface AvatarUploadProps {
    /** URL/Blob da imagem (controlado) */
    value?: string;
    /** Callback devolve o ficheiro e o URL criado */
    onChange?: (file: File | null, url: string | null) => void;
    /** Diâmetro do avatar (px) */
    size?: number;
    /** Placeholder (ex.: iniciais) se não houver imagem */
    placeholder?: React.ReactNode;
    /** Mostrar ou esconder o botão-ícone */
    showIcon?: boolean;
    /** Estilos extra */
    sx?: SxProps<Theme>;
}
export declare const AvatarUpload: React.FC<AvatarUploadProps>;
