// src/components/Paginator/Paginator.tsx
import React from 'react';
import { Stack, Pagination, PaginationProps as MuiPaginationProps } from '@mui/material';

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

export const Paginator: React.FC<PaginatorProps> = ({
  count,
  page,
  onChange,
  siblingCount    = 1,
  boundaryCount   = 1,
  showFirstButton = false,
  showLastButton  = false,
  muiProps        = {},
}) => (
  <Stack alignItems="center" sx={{ my: 2 }}>
    <Pagination
      count={count}
      page={page}
      onChange={onChange}
      siblingCount={siblingCount}
      boundaryCount={boundaryCount}
      showFirstButton={showFirstButton}
      showLastButton={showLastButton}
      color="primary"
      {...muiProps}
    />
  </Stack>
);

export default Paginator;
