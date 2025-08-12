// src/components/StepCard/InfoStepCard.tsx
import { Card, Box, Typography } from '@mui/material';
import { styled } from '@mui/system';
import React from 'react';
import { WhiteCard } from '../Card/WhiteCard';

export interface InfoStepCardProps {
  step: number | string;
  title: string;
  description: string;
  accentColor?: string;
  backgroundColor?: string;
  /** Diâmetro do círculo (px) – default 88 px */
  circleSize?: number;
  /** Largura do aro branco (px) – default 6 px */
  circleBorderWidth?: number;
  /** Cor do aro – default #fff */
  circleBorderColor?: string;
  cardProps?: React.ComponentProps<typeof Card>;
}

const Circle = styled(Box, {
  shouldForwardProp: (prop) =>
    !['accentColor', 'circleSize', 'circleBorderWidth', 'circleBorderColor'].includes(
      prop as string,
    ),
})<{
  accentColor: string;
  circleSize: number;
  circleBorderWidth: number;
  circleBorderColor: string;
}>(({ theme, accentColor, circleSize, circleBorderWidth, circleBorderColor }) => ({
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: circleSize,
  height: circleSize,
  borderRadius: '50%',
  backgroundColor: accentColor || theme.palette.primary.main,
  color: theme.palette.getContrastText(accentColor || theme.palette.primary.main),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: circleSize * 0.35,
  border: `${circleBorderWidth}px solid ${circleBorderColor}`,
  boxSizing: 'border-box',
}));

const InfoStepCard: React.FC<InfoStepCardProps> = ({
  step,
  title,
  description,
  accentColor,
  backgroundColor,
  circleSize = 88,
  circleBorderWidth = 6,
  circleBorderColor = '#fff',
  cardProps,
}) => {
  const topSpacing = circleSize / 2; // espaço para o círculo “entrar” no cartão

  return (
    <Box position="relative" textAlign="center" mt={2} width="100%">
      <Circle
        accentColor={accentColor || ''}
        circleSize={circleSize}
        circleBorderWidth={circleBorderWidth}
        circleBorderColor={circleBorderColor}
        marginTop='1em'
      >
        {step}
      </Circle>

      <WhiteCard
        sx={{
          width: '100%',            // ← garante 100% de largura
          pt: '3em',
          padding: '3em',
          pb: 3,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          border: 'none',
          marginTop:'2em',
          backgroundColor,
          ...cardProps?.sx,
        }}>
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>

        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {description}
        </Typography>
      </WhiteCard>
    </Box>
  );
};

export default InfoStepCard;
