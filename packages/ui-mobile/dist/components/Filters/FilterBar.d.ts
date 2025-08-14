import React from "react";
import { ViewStyle } from "react-native";
export type FilterChip = {
    id: string;
    label: string;
    icon?: string;
    selected?: boolean;
    onPress?: () => void;
    onClear?: () => void;
};
export interface FilterBarProps {
    chips: FilterChip[];
    style?: ViewStyle;
    dividerColor?: string;
}
declare const FilterBar: React.FC<FilterBarProps>;
export default FilterBar;
