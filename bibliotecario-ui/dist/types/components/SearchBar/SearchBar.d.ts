import React from 'react';
import { TextFieldProps } from '@mui/material';
export interface SearchBarProps {
    /** Valor actual do input */
    value: string;
    /** Chamado sempre que o valor muda */
    onChange: (newValue: string) => void;
    /** Chamado quando o utilizador pressiona Enter ou clica em pesquisar */
    onSearch?: (value: string) => void;
    /** Placeholder do input */
    placeholder?: string;
    /** Props extra para o TextField */
    textFieldProps?: Omit<TextFieldProps, 'value' | 'onChange' | 'placeholder'>;
}
export declare const SearchBar: React.FC<SearchBarProps>;
export default SearchBar;
