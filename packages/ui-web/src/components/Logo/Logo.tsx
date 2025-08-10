// src/components/Logo/Logo.tsx
import React from 'react';
import { Box, BoxProps } from '@mui/material';
import logoUrl from './LogoBiblio.svg';

export interface LogoProps extends BoxProps {
  width?: string | number;
  height?: string | number;
}

export const Logo: React.FC<LogoProps> = ({
  width  = '120px',
  height = 'auto',
  sx,
  ...boxProps
}) => (
  <Box
    component="img"
    src={logoUrl}
    alt="Logótipo"
    sx={[
      { display: 'block', width, height },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...boxProps}
  />
);
