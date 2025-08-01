// src/components/Button/SecondaryButton.tsx
import { styled, Button as MuiButton } from '@mui/material';

export const SecondaryButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: 32,
  paddingInline: theme.spacing(3),
  textTransform: 'none',
  fontWeight: 500,
  backgroundColor: theme.palette.common.white,
  color: theme.palette.primary.main,
  border: `2px solid ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    borderColor: theme.palette.primary.main,
  },
  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    borderColor: theme.palette.action.disabledBackground,
  },
}));
