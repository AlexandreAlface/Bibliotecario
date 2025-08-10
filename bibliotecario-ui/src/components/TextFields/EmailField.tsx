// EmailField.tsx
import { BaseTextField, type BaseProps } from './BaseTextField';
import type { TextFieldProps } from '@mui/material';

export function EmailField(props: TextFieldProps & BaseProps) {
  return (
    <BaseTextField
      type="email"
      label="E-mail ou telemóvel"
      autoComplete="email"
      {...props}
    />
  );
}
