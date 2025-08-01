// src/components/Button/PrimaryButton.tsx
import {
  styled,
  alpha,
  Button as MuiButton,
  type ButtonProps,
} from '@mui/material';
import { shouldForwardProp } from '@mui/system';
import { SizeProps } from '../theme';

interface PrimaryProps extends ButtonProps, SizeProps {}

const Styled = styled(MuiButton, {
  // Impede que props customizadas vão parar ao DOM
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== 'radius' && prop !== 'px',
})<SizeProps>(({ theme, radius = 4, px = 3 }) => ({
  borderRadius: theme.spacing(radius),
  paddingInline: theme.spacing(px),
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

export function PrimaryButton(props: PrimaryProps) {
  return (
    <Styled
      variant="contained"
      color="primary"
      disableElevation
      {...props}
    />
  );
}
