import React from "react";
import { ViewStyle } from "react-native";
export interface PaginatorProps {
    /** Página atual (1-based) */
    page: number;
    /** Total de páginas (>= 1) */
    totalPages: number;
    /** Callback ao mudar de página */
    onPageChange: (nextPage: number) => void;
    /** Vizinhos ao redor da atual */
    siblingCount?: number;
    /** Itens fixos nas pontas (1 mantém 1 e último sempre visíveis) */
    boundaryCount?: number;
    /** Mostrar setas anterior/seguinte */
    showArrows?: boolean;
    /** Estilo do container */
    style?: ViewStyle;
    /** Diâmetro do círculo ativo (o slot visual do número) */
    activeSize?: number;
    /** Largura/altura do “hit area” de cada item (todos iguais) */
    hitSize?: number;
    /** Espaço horizontal entre itens */
    gap?: number;
    /** Variante: "minimal" (círculo no ativo) ou "boxed" */
    variant?: "minimal" | "boxed";
    accessibilityLabel?: string;
}
declare const Paginator: React.FC<PaginatorProps>;
export default Paginator;
