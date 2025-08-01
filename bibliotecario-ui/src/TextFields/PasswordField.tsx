// PasswordField.tsx
import { useState } from 'react';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { BaseProps, BaseTextField } from './BaseTextField';
import { IconButton, InputAdornment, type TextFieldProps } from '@mui/material';

export function PasswordField(props: TextFieldProps & BaseProps) {
  const [show, setShow] = useState(false);

  return (
    <BaseTextField
      type={show ? 'text' : 'password'}
      label="Palavra-passe"
      autoComplete="current-password"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShow((v) => !v)}
              edge="end"
              aria-label={show ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              size="small"
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
            <span style={{ marginLeft: 4, fontSize: 14 }}>
              {show ? 'Ocultar' : 'Mostrar'}
            </span>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}
