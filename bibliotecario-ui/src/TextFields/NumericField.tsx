// NumericField.tsx

import { BaseTextField } from './BaseTextField';
import type { TextFieldProps } from '@mui/material';

export function NumericField(props: TextFieldProps) {
  return (
    <BaseTextField
      label="Número de telemóvel"
      type="tel"
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      {...props}
    />
  );
}
