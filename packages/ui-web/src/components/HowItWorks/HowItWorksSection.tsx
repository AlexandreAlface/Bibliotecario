// src/components/HowItWorks/HowItWorksSection.tsx
import { Box, Stack } from '@mui/material';
import React from 'react';
import { InfoStepCard } from '../StepCard';
import { InfoStepCardProps } from '../StepCard/InfoStepCard';

export interface HowItWorksSectionProps {
  /**
   * Lista de passos a apresentar.
   * Cada item é simplesmente o conjunto de props de <InfoStepCard />.
   */
  steps: InfoStepCardProps[];
  /**
   * Direcção dos cartões.
   * - 'vertical' (por defeito) = empilhados
   * - 'horizontal' = lado-a-lado
   */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Espaço entre cartões em unidades de theme.spacing (default 6 = 48 px)
   */
  spacing?: number;
  /**
   * Sx extra para o <Stack />
   */
  sx?: object;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  steps,
  orientation = 'vertical',
  spacing = 6,
  sx,
}) => {
  if (!steps?.length) return null;

  return (
    <Box width="100%">
      <Stack
        direction={orientation === 'horizontal' ? 'row' : 'column'}
        spacing={spacing}
        alignItems="stretch"
        justifyContent="center"
        
        sx={sx}
      >
       {steps.map((step, idx) => {
          const mergedCardProps = {
            ...step.cardProps,
            sx: {
              ...(step.cardProps?.sx || {}),
              minHeight: 'auto',
              
            },
          };

          return (
            <InfoStepCard
              key={idx}
              {...step}
              cardProps={mergedCardProps}
            />
          );
        })}
      </Stack>
    </Box>
  );
};

