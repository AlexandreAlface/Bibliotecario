// src/components/Divider/SectionDivider.tsx
import { Divider, Typography, SxProps, Theme } from '@mui/material';

export interface SectionDividerProps {
  label: string;
  /** Largura total do divisor. Aceita %, px, rem…  – default '100%' */
  width?: string | number;
  /** Espessura da linha em px – default 1 */
  thickness?: number;
  /** Espaçamento vertical (theme.spacing) – default 3 */
  spacingY?: number;
  /** Qualquer extra do sx para override fino */
  sx?: SxProps<Theme>;
}

export function SectionDivider({
  label,
  width = '100%',
  thickness = 1,
  spacingY = 3,
  sx,
}: SectionDividerProps) {
  return (
    <Divider
      textAlign="center"
      sx={{
        width,
        my: spacingY,
        borderBottomWidth: thickness,
        marginBottom: '0em',
        ...sx,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={500}
        sx={{ px: 1 }}
      >
        {label}
      </Typography>
    </Divider>
  );
}
