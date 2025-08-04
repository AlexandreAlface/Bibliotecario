// src/components/TextField/BaseTextField.tsx
import { styled, shouldForwardProp } from '@mui/system';
import { TextField, type TextFieldProps } from '@mui/material';

export interface BaseProps {
  radius?: number;
  px?: number;
  py?: number;
}

export const BaseTextField = styled(TextField, {
  shouldForwardProp: (prop) =>
    shouldForwardProp(prop) &&
    !['radius', 'px', 'py'].includes(prop as string),
})<TextFieldProps & BaseProps>(
  ({ theme, radius = 3, px = 2, py = 1.5 }) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.spacing(radius),
      '& fieldset': { borderColor: theme.palette.grey[400] },
      '&:hover fieldset': { borderColor: theme.palette.primary.main },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputBase-input': {
      padding: theme.spacing(py, px),
    },
  }),
);
