import React, { useMemo } from 'react';
import { Box, LinearProgress, linearProgressClasses, Typography } from '@mui/material';

export interface QuizProgressBarProps {
  /** Passo actual (1-based) */
  passo: number;
  /** Número total de passos/perguntas */
  total: number;
  /** Mostrar percentagem por cima?  */
  mostrarTexto?: boolean;
}

/**
 * Barra de progresso animada para o Quiz.
 */
export const QuizProgressBar: React.FC<QuizProgressBarProps> = ({
  passo,
  total,
  mostrarTexto = true,
}) => {
  /* evita divisões por zero */
  const pct = useMemo(() => (total > 0 ? (passo / total) * 100 : 0), [passo, total]);

  return (
    <Box>
      {mostrarTexto && (
        <Typography variant="caption" mb={0.5} display="block">
          {Math.round(pct)}% concluído
        </Typography>
      )}

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          [`&.${linearProgressClasses.colorPrimary}`]: {
            bgcolor: '#E4E4E4',
          },
          [`& .${linearProgressClasses.bar}`]: {
            borderRadius: 4,
            /* animação suave */
            transition: 'transform .4s ease-out',
            bgcolor: 'primary.main',
          },
        }}
      />
    </Box>
  );
};
