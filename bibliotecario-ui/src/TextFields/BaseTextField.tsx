// BaseTextField.tsx
import { styled, TextField, TextFieldProps } from '@mui/material';

export const BaseTextField = styled((props: TextFieldProps) => (
  <TextField variant="outlined" fullWidth {...props} />
))(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(3),          // 24 px se spacing=8
    '& fieldset': { borderColor: theme.palette.grey[400] },
    '&:hover fieldset': { borderColor: theme.palette.primary.main },
    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
  },
  '& .MuiInputBase-input': { padding: theme.spacing(1.5, 2) },
}));
    