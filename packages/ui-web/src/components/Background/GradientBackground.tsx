import { styled } from '@mui/material/styles';
import { Box, type BoxProps } from '@mui/material';

interface GradientProps extends BoxProps {
  /** cor inicial (qualquer CSS color) – default theme.palette.secondary.main (verde) */
  from?: string;
  /** cor final – default theme.palette.primary.main (roxo) */
  to?: string;
  /** ângulo do gradiente em deg – default 135 */
  angle?: number;
}

export const GradientBackground = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'from' && prop !== 'to' && prop !== 'angle',
})<GradientProps>(({ theme, from, to, angle = 135 }) => ({
  minHeight: '100vh',
  width: '100%',
  background: `linear-gradient(${angle}deg, ${
    from ?? theme.palette.secondary.main
  } 0%, ${to ?? theme.palette.primary.main} 100%)`,
  position: 'relative',
  overflow: 'hidden',
}));
