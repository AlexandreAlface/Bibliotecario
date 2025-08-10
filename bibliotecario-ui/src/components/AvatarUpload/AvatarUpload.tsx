import React, { useRef, useState, useEffect } from 'react';
import { Avatar, IconButton, Box, SxProps, Theme } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

export interface AvatarUploadProps {
  /** URL/Blob da imagem (controlado) */
  value?: string;
  /** Callback devolve o ficheiro e o URL criado */
  onChange?: (file: File | null, url: string | null) => void;
  /** Diâmetro do avatar (px) */
  size?: number;
  /** Placeholder (ex.: iniciais) se não houver imagem */
  placeholder?: React.ReactNode;
  /** Mostrar ou esconder o botão-ícone */
  showIcon?: boolean;
  /** Estilos extra */
  sx?: SxProps<Theme>;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  size = 128,
  showIcon = true,
  placeholder,
  sx,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState<string | null>(value ?? null);

  /* sincroniza valor controlado */
  useEffect(() => {
    value !== undefined && setUrl(value);
  }, [value]);

  /* liberta blob URL quando o componente desmonta */
  useEffect(() => {
    return () => {
      url && url.startsWith('blob:') && URL.revokeObjectURL(url);
    };
  }, [url]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newUrl = URL.createObjectURL(file);
    setUrl(newUrl);
    onChange?.(file, newUrl);
  };

  return (
    <Box position="relative" width={size} height={size} sx={sx}>
      <Avatar
        src={url ?? undefined}
        sx={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {placeholder ?? '•'}
      </Avatar>

      {showIcon && (
        <IconButton
          size="small"
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' },
          }}
          onClick={() => inputRef.current?.click()}
        >
          <PhotoCameraIcon fontSize="small" />
        </IconButton>
      )}

      {/* input invisível */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
    </Box>
  );
};
