import { Card, CardProps, styled } from '@mui/material';
import { shouldForwardProp } from '@mui/system';

interface WhiteCardProps extends CardProps {
  /** Largura (px, %, rem…). Se omitido usa auto/max-content */
  width?: string | number;
  /** Altura (px, %, vh…). Opcional */
  height?: string | number;
}

const StyledCard = styled(Card, {
  shouldForwardProp: (prop) =>
    shouldForwardProp(prop) && prop !== 'width' && prop !== 'height',
})<WhiteCardProps>(({ theme, width, height }) => ({
  borderRadius: theme.spacing(3),      /* 24 px se spacing = 8 */
  padding: theme.spacing(4),           /* 32 px */
  backgroundColor: theme.palette.common.white,
  width,
  height,
}));

export function WhiteCard(props: WhiteCardProps) {
  return <StyledCard variant="outlined" {...props} />;
}
