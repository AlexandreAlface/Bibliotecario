// src/components/SearchBar/SearchBar.tsx
import React, { KeyboardEvent } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  TextFieldProps
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon  from '@mui/icons-material/Clear';

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

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Pesquisar…',
  textFieldProps
}) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <TextField
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyPress={handleKeyPress}
      variant="outlined"
      size="small"
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton
              size="small"
              onClick={() => onSearch?.(value)}
              edge="start"
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => onChange('')}
              edge="end"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      {...textFieldProps}
    />
  );
};

export default SearchBar;
