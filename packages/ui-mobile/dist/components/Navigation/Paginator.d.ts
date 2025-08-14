import React from "react";
import { ViewStyle } from "react-native";
export interface PaginatorProps {
    /** Página atual (1-based) */
    page: number;
    /** Total de páginas (>= 1) */
    totalPages: number;
    /** Callback ao mudar de página */
    onPageChange: (nextPage: number) => void;
    /** Vizinhos ao redor da atual (default 1) */
    siblingCount?: number;
    /** Itens fixos nas pontas (default 1) */
    boundaryCount?: number;
    /** Mostrar setas (default true) */
    showArrows?: boolean;
    /** Estilo do container */
    style?: ViewStyle;
    /** Diâmetro do círculo ativo */
    activeSize?: number;
    /** Tamanho do hit-area de todos os itens (largura/altura) */
    hitSize?: number;
    /** Espaço horizontal entre itens */
    gap?: number;
    /** "minimal" = círculo no ativo, números soltos */
    variant?: "minimal" | "boxed";
    accessibilityLabel?: string;
}
declare const Paginator: React.FC<PaginatorProps>;
export default Paginator;
