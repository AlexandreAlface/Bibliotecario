import React from 'react';
import { PaginationProps as MuiPaginationProps } from '@mui/material';
export interface PaginatorProps {
    /**
     * Número total de páginas
     */
    count: number;
    /**
     * Página actual (1-based)
     * Se não fornecido, o componente será uncontrolled
     */
    page?: number;
    /**
     * Callback quando o utilizador muda de página
     */
    onChange?: (event: React.ChangeEvent<unknown>, page: number) => void;
    /**
     * Número de páginas a mostrar ao lado da página actual
     * @default 1
     */
    siblingCount?: number;
    /**
     * Número de páginas de fronteira a mostrar (início/fim)
     * @default 1
     */
    boundaryCount?: number;
    /**
     * Mostrar botões “Primeiro” e “Último”
     * @default false
     */
    showFirstButton?: boolean;
    showLastButton?: boolean;
    /**
     * Props extras para o <Pagination> do MUI
     */
    muiProps?: Omit<MuiPaginationProps, 'count' | 'page' | 'onChange' | 'siblingCount' | 'boundaryCount' | 'showFirstButton' | 'showLastButton'>;
}
export declare const Paginator: React.FC<PaginatorProps>;
export default Paginator;
