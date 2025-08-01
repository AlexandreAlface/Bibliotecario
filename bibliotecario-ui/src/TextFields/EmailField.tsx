// EmailField.tsx
import { BaseTextField } from './BaseTextField';
import type { TextFieldProps } from '@mui/material';

export function EmailField(props: TextFieldProps) {
  return (
    <BaseTextField
      type="email"
      label="E-mail ou telemóvel"
      autoComplete="email"
      {...props}
    />
  );
}
