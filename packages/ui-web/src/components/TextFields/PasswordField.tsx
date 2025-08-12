// packages/ui-web/src/components/TextFields/PasswordField.tsx
import { forwardRef, useState } from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';


type Props = Omit<TextFieldProps, 'type' | 'variant'> & {
  inputRef?: React.Ref<HTMLInputElement>;
};

export const PasswordField = forwardRef<HTMLInputElement, Props>(function PasswordField(
  { InputProps, ...rest },
  ref
) {
  const [show, setShow] = useState(false);

  return (
    <TextField
      {...rest}
      type={show ? 'text' : 'password'}
      variant="outlined"
      fullWidth
      inputRef={ref}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setShow(s => !s)} edge="end" aria-label="alternar visibilidade">
              {show ? <VisibilityOff/> : <Visibility/>}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
});
