import { forwardRef } from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';

type Props = Omit<TextFieldProps, 'type' | 'variant'> & {
  inputRef?: React.Ref<HTMLInputElement>; // compat
};

export const EmailField = forwardRef<HTMLInputElement, Props>(function EmailField(
  { inputRef, ...props },
  ref
) {
  return (
    <TextField
      {...props}
      type="email"
      variant="outlined"
      fullWidth
      inputRef={ref ?? inputRef}
    />
  );
});
