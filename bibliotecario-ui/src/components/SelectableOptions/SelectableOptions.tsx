import React from 'react';
import {
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  SxProps,
  Theme,
} from '@mui/material';

export type Option = { value: string | number; label: React.ReactNode };

export interface SelectableOptionsProps {
  /** Título/legenda do grupo (opcional) */
  label?: string;
  /** Lista de opções */
  options: Option[];
  /** Valor(es) selecionado(s) */
  value: string | number | (string | number)[];
  /** Callback de alteração */
  onChange: (value: string | number | (string | number)[]) => void;
  /** Tipo de controlo */
  variant?: 'checkbox' | 'radio';
  /** Disposição horizontal ou vertical */
  row?: boolean;
  /** Estilos adicionais */
  sx?: SxProps<Theme>;
}

export const SelectableOptions: React.FC<SelectableOptionsProps> = ({
  label,
  options,
  value,
  onChange,
  variant = 'checkbox',
  row = false,
  sx,
}) => {
  const isCheckbox = variant === 'checkbox';

  const handleChange = (optionValue: string | number) => (
    _: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    if (isCheckbox) {
      const newValue = Array.isArray(value) ? [...value] : [];
      checked
        ? newValue.push(optionValue)
        : newValue.splice(newValue.indexOf(optionValue), 1);
      onChange(newValue);
    } else {
      onChange(optionValue);
    }
  };

  return (
    <FormControl component="fieldset" sx={sx}>
      {label && <FormLabel component="legend">{label}</FormLabel>}

      {isCheckbox ? (
        <FormGroup row={row}>
          {options.map(({ value: v, label: l }) => (
            <FormControlLabel
              key={v}
              control={
                <Checkbox
                  checked={Array.isArray(value) && value.includes(v)}
                  onChange={handleChange(v)}
                />
              }
              label={l}
            />
          ))}
        </FormGroup>
      ) : (
        <RadioGroup row={row} value={value} onChange={(_, val) => onChange(val)}>
          {options.map(({ value: v, label: l }) => (
            <FormControlLabel
              key={v}
              value={v}
              control={<Radio />}
              label={l}
            />
          ))}
        </RadioGroup>
      )}
    </FormControl>
  );
};
