// src/components/AgendaFeed/AgendaLargeCard.tsx
import React, { useState } from 'react';
import {
  Paper,
  CardMedia,
  Box,
  Typography,
  Button,
  Collapse,
  useTheme
} from '@mui/material';
import { AgendaItem } from '../../hooks/useAgendaFeed';

export interface AgendaLargeCardProps extends AgendaItem {
  /** largura do cartão (ex: '100%', '600px') */
  width?: string | number;
  /** proporção da área de imagem (ex: '16/9') */
  imageRatio?: string;
  /** número de caracteres antes de truncar */
  truncateLength?: number;
}

export const AgendaLargeCard: React.FC<AgendaLargeCardProps> = ({
  title,
  pubDate,
  description,
  thumbnailUrl,
  link,
  width           = '100%',
  imageRatio      = '16/9',
  truncateLength  = 200,
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  // decodifica e limpa HTML
  const decodeHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
  };
  const fullText = decodeHtml(description);
  const displayText = expanded
    ? fullText
    : fullText.length > truncateLength
      ? fullText.slice(0, truncateLength) + '…'
      : fullText;

  return (
    <Paper
      elevation={4}
      sx={{
        width,
        borderRadius: 4,
        overflow: 'hidden',
        mx: 'auto',
      }}
    >
      {/* IMAGEM */}
      {thumbnailUrl && (
        <Box position="relative">
          <CardMedia
            component="img"
            image={thumbnailUrl}
            alt={title}
            sx={{
              width:       '100%',
              aspectRatio: imageRatio,
              objectFit:   'cover',
            }}
          />
          {/* TÍTULO SOBRE A IMAGEM */}
          <Box
            sx={{
              position: 'absolute',
              bottom:   0,
              left:     0,
              width:    '100%',
              bgcolor:  'rgba(0,0,0,0.4)',
              color:    '#fff',
              p:        2,
            }}
          >
            <Typography variant="h5" component="h2">
              {title}
            </Typography>
          </Box>
        </Box>
      )}

      {/* CONTEÚDO */}
      <Box sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
        {/* DATA */}
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {new Date(pubDate).toLocaleDateString('pt-PT', {
            day: '2-digit', month: 'long', year: 'numeric'
          })}
        </Typography>

        {/* DESCRIÇÃO TRUNCADA / COMPLETA */}
        <Collapse in sx={{ mb: 2 }}>
          <Typography variant="body1" paragraph>
            {displayText}
          </Typography>
        </Collapse>

        {/* BOTÃO */}
        <Box textAlign="right">
          <Button
            variant="contained"
            onClick={() => setExpanded(e => !e)}
            sx={{ mr: 1 }}
          >
            {expanded ? 'Ver menos' : 'Saber mais'}
          </Button>
          <Button
            variant="outlined"
            href={link}
            target="_blank"
          >
            Ir para página
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
