// src/components/BookCard/BookCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Rating,
  TextField,
  Button,
  useTheme
} from '@mui/material';

export type BookCardVariant = 'view' | 'edit' | 'reserve';

export interface BookCardProps {
  variant?: BookCardVariant;
  title: string;
  coverImage: string;
  startDate?: string;
  endDate?: string;
  rating?: number;
  comment?: string;
  onSave?: (rating: number, comment: string, coverImage: string) => void;
  onReserve?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  variant = 'view',
  title,
  coverImage,
  startDate,
  endDate,
  rating = 0,
  comment = '',
  onSave,
  onReserve,
}) => {
  const theme = useTheme();
  const [currentCoverImage, setCurrentCoverImage] = useState(coverImage);
  useEffect(() => {
    setCurrentCoverImage(coverImage);
  }, [coverImage]);

  const [currentRating, setCurrentRating] = useState(rating);
  const [currentComment, setCurrentComment] = useState(comment);

  const handleSave = () => onSave?.(currentRating, currentComment, currentCoverImage);
  const handleReserve = () => onReserve?.();

  return (
    <Card
      sx={{
        width: 300,
        borderRadius: 2,
        bgcolor: theme.palette.secondary.light,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* FIX: background-image em vez de img */}
      <CardMedia
        image={currentCoverImage}
        title={title}
        sx={{
          pt: '150%',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6">{title}</Typography>

        {variant === 'view' && (
          <>
            {startDate && endDate && (
              <Typography variant="body2">
                Início: {startDate} — Concluído: {endDate}
              </Typography>
            )}
            <Box display="flex" alignItems="center">
              <Rating value={rating} readOnly size="small" />
            </Box>
            {comment && (
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                “{comment}”
              </Typography>
            )}
          </>
        )}

        {variant === 'edit' && (
          <>
            <TextField
              label="URL da imagem da capa"
              type="url"
              value={currentCoverImage}
              onChange={e => setCurrentCoverImage(e.target.value)}
              fullWidth
            />
            <Box display="flex" alignItems="center">
              <Rating
                value={currentRating}
                onChange={(_, v) => setCurrentRating(v ?? 0)}
              />
            </Box>
            <TextField
              label="Comentário"
              multiline
              minRows={3}
              value={currentComment}
              onChange={e => setCurrentComment(e.target.value)}
              fullWidth
            />
            <Box mt="auto" textAlign="center">
              <Button variant="contained" color="primary" onClick={handleSave}>
                Guardar avaliação
              </Button>
            </Box>
          </>
        )}

        {variant === 'reserve' && (
          <>
            <Box display="flex" alignItems="center">
              <Rating value={rating} readOnly />
            </Box>
            <Box mt="auto" textAlign="center">
              <Button variant="contained" color="primary" onClick={handleReserve}>
                Reservar
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};
