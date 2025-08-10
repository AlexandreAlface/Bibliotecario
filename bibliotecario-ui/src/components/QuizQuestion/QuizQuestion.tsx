import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Typography,
  SxProps,
  Theme,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';

/* ---------- Tipos ---------- */
export interface QuizOption {
  label: string;
  value: string | number;
}

export interface QuizQuestionProps {
  pergunta: string;
  opcoes: QuizOption[];
  valor?: QuizOption['value'];
  onChange?: (valor: QuizOption['value']) => void;
  topoIcon?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/* ---------- Componente ---------- */
export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  pergunta,
  opcoes,
  valor,
  onChange,
  topoIcon,
  sx,
}) => (
  <Box textAlign="center" sx={sx}>
    {/* Pergunta */}
    <Box
      position="relative"
      bgcolor="rgba(122,68,189,0.08)"
      color="primary.dark"
      px={4}
      py={3}
      borderRadius={2}
      mb={4}
    >
      {/* {topoIcon && (
        <Avatar
          sx={{
            position: 'absolute',
            top: -20,
            right: '50%',
            transform: 'translateX(50%)',
            bgcolor: 'primary.main',
            width: 40,
            height: 40,
            border: '3px solid #fff',
          }}
        >
          {topoIcon}
        </Avatar>
      )} */}

      <Typography variant="h6" fontWeight={600}>
        {pergunta}
      </Typography>
    </Box>

    {/* Opções */}
    <Grid container spacing={4} justifyContent="center">
      {opcoes.map((o) => {
        const selected = o.value === valor; // ← declarada aqui

        return (
          <Grid item key={o.value}>
            <Card
              elevation={0}
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                bgcolor: selected ? 'primary.main' : 'rgba(122,68,189,0.08)',
                color: selected ? '#fff' : 'primary.dark',
                transition: 'all .25s',
              }}
            >
              <CardActionArea
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 2,
                }}
                onClick={() => onChange?.(o.value)}
              >
                <Typography
                  variant="h6"
                  fontWeight={600}
                  textAlign="center"
                  sx={{ userSelect: 'none' }}
                >
                  {o.label}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  </Box>
);
