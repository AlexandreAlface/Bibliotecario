import React from "react";
import { ViewStyle } from "react-native";
export type FilterOption = {
    id: string;
    label: string;
};
export type FilterConfig = {
    /** chave única do filtro (ex.: "age" | "theme") */
    key: string;
    /** texto no chip do filtro */
    label: string;
    /** opções do dropdown */
    options: FilterOption[];
    /** se true permite múltipla seleção */
    multiple?: boolean;
};
export type SelectedMap = Record<string, string[] | string | undefined>;
export interface FilterBarAdvancedProps {
    /** filtros que aparecem como chips no topo */
    filters: FilterConfig[];
    /** valores selecionados controlados (por chave) */
    value: SelectedMap;
    /** callback quando algum filtro muda */
    onChange: (next: SelectedMap) => void;
    /** estilos */
    style?: ViewStyle;
    chipsRowStyle?: ViewStyle;
    tagsRowStyle?: ViewStyle;
    /** mostra/oculta a linha de tags selecionadas */
    showSelectedTags?: boolean;
    /** rótulo de acessibilidade para a área de filtros */
    accessibilityLabel?: string;
}
/**
 * Barra de filtros com chips que abrem menus.
 * Mostra os itens selecionados como chips com X, e um Divider separando.
 */
declare const FilterBarAdvanced: React.FC<FilterBarAdvancedProps>;
export default FilterBarAdvanced;
