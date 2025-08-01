// src/components/Button/PrimaryButton.tsx
import { styled, alpha, Button as MuiButton, ButtonProps } from '@mui/material';

/**
 * Botão principal da aplicação.
 * - Raio de canto consistente com o tema
 * - Hover subtil (90 % da cor primária)
 * - Desactiva a sombra normal do MUI
 * - Estado :disabled harmonizado com o tema
 * - Outline visível para acessibilidade (focus-visible)
 */
const StyledPrimaryButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: theme.spacing(4),          // 32 px se spacing = 8
  paddingInline: theme.spacing(3),         // horizontal 24 px
  textTransform: 'none',
  fontWeight: 600,
  boxShadow: 'none',
  lineHeight: 1.5,

  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.9),
    boxShadow: 'none',
  },

  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },

  '&.Mui-focusVisible': {
    outline: `2px solid ${alpha(theme.palette.primary.light, 0.8)}`,
    outlineOffset: 2,
  },
}));

export function PrimaryButton(props: ButtonProps) {
  return (
    <StyledPrimaryButton
      variant="contained"
      color="primary"
      disableElevation
      {...props}
    />
  );
}
