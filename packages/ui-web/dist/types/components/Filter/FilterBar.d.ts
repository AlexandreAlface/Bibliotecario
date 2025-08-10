import React, { ReactElement } from 'react';
export interface FilterOption {
    value: string;
    label: string;
}
export interface FilterDefinition {
    id: string;
    label: string;
    options: FilterOption[];
}
export interface FilterBarProps {
    filters: FilterDefinition[];
    selected: Record<string, string[]>;
    onChange: (filterId: string, values: string[]) => void;
    icons?: Record<string, ReactElement>;
    chipIcons?: Record<string, ReactElement>;
}
export declare const FilterBar: React.FC<FilterBarProps>;
