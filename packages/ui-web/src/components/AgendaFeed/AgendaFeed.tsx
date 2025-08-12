// src/components/AgendaFeed/AgendaFeed.tsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  useTheme,
  CardMedia
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { AgendaItem, useAgendaFeed } from '../../hooks/useAgendaFeed';

export interface AgendaFeedProps {
  feedUrl: string;
  columns?: number;
  imageRatio?: string;
  contentPadding?: number;
  cardMaxWidth?: string | number;
  actions?: (item: AgendaItem) => React.ReactNode;
}

export const AgendaFeed: React.FC<AgendaFeedProps> = ({
  feedUrl,
  columns        = 2,
  imageRatio     = '16/9',   // usar aspectRatio moderno
  contentPadding = 2,
  cardMaxWidth   = '360px',
  actions
}) => {
  const theme = useTheme();
  const { items, loading, error } = useAgendaFeed(feedUrl);

  if (loading) return <Typography>Carregando eventos…</Typography>;
  if (error)   return <Typography color="error">Erro: {error.message}</Typography>;
  if (!items?.length) return <Typography>Sem eventos.</Typography>;

  // função helper para decodificar HTML entities e extrair texto
  const decodeHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
  };

  return (
    <Grid container spacing={2} justifyContent="center">
      {items.map((item, i) => {
        // decodifica o description
        const fullText = decodeHtml(item.description);
        // tenta extrair Data:xxx e Local:yyy
        const dataMatch    = fullText.match(/Data:\s*([^|]+)/i);
        const localMatch   = fullText.match(/Local:\s*([^|]+)/i);
        // resumo antes de qualquer “Data:”
        const resumo       = fullText.split(/Data:/i)[0].trim();

        return (
          <Grid
            key={i}
            item xs={12} sm={Math.floor(12 / columns)}
            sx={{ display: 'flex', justifyContent: 'center' }}
          >
            <Paper
              elevation={2}
              sx={{
                width:         '100%',
                maxWidth:      cardMaxWidth,
                display:       'flex',
                flexDirection: 'column',
                borderRadius:  3,
                overflow:      'hidden',
                bgcolor:       theme.palette.background.paper,
              }}
            >
              {/* imagem no topo */}
              {item.thumbnailUrl && (
                <CardMedia
                  component="img"
                  image={item.thumbnailUrl}
                  alt={item.title}
                  sx={{
                    width:               '100%',
                    aspectRatio:         imageRatio,
                    objectFit:           'cover',
                  }}
                />
              )}

              {/* conteúdo textual */}
              <Box sx={{ p: contentPadding }}>
                <Typography
                  variant="h6"
                  component="h3"
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  {item.title}
                </Typography>

                {/* Data com ícone */}
                {dataMatch && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      {dataMatch[1].trim()}
                    </Typography>
                  </Box>
                )}

                {/* Local com ícone */}
                {localMatch && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOnIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      {localMatch[1].trim()}
                    </Typography>
                  </Box>
                )}

                {/* Resumo */}
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {resumo.length > 140 ? resumo.slice(0, 140) + '…' : resumo}
                </Typography>

                {/* Ações */}
                <Box textAlign="right">
                  {actions?.(item) ?? (
                    <Button
                      variant="contained"
                      size="small"
                      href={item.link}
                      target="_blank"
                    >
                      Saber mais
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
};
