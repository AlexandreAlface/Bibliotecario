// src/components/Button/SecondaryButton.tsx
import { styled, Button as MuiButton, type ButtonProps } from '@mui/material';
import { shouldForwardProp } from '@mui/system';
import { SizeProps } from '../theme';

interface SecondaryProps extends ButtonProps, SizeProps {}

const Styled = styled(MuiButton, {
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== 'radius' && prop !== 'px',
})<SizeProps>(({ theme, radius = 4, px = 3 }) => ({
  borderRadius: theme.spacing(radius),
  paddingInline: theme.spacing(px),
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

export function SecondaryButton(props: SecondaryProps) {
  return <Styled variant="outlined" {...props} />;
}
