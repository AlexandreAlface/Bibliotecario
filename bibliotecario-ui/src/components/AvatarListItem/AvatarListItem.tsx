import React from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Tooltip,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export interface Action {
  /** Ícone a renderizar dentro do IconButton */
  icon: React.ReactNode;
  /** Tooltip opcional */
  tooltip?: string;
  /** Callback */
  onClick?: () => void;
  /** Desabilitar botão? */
  disabled?: boolean;
}

export interface AvatarListItemProps {
  avatarSrc?: string;
  /** Texto principal (ex.: "Camila, 7 anos") */
  label: React.ReactNode;
  /** Lista de acções à direita */
  actions?: Action[];
  /** Tamanho do avatar (px) */
  avatarSize?: number;
  /** Estilos extra */
  sx?: SxProps<Theme>;
}

export const AvatarListItem: React.FC<AvatarListItemProps> = ({
  avatarSrc,
  label,
  actions = ([
    { icon: <EditIcon />, tooltip: 'Editar' },
    { icon: <DeleteIcon />, tooltip: 'Remover' },
  ] as Action[]),
  avatarSize = 48,
  sx,
}) => (
  <Box
    display="flex"
    alignItems="center"
    gap={2}
    sx={sx}
  >
    <Avatar
      src={avatarSrc}
      sx={{ width: avatarSize, height: avatarSize, flexShrink: 0 }}
    />

    <Typography variant="body1" sx={{ flexGrow: 1 }}>
      {label}
    </Typography>

    {actions.map(({ icon, tooltip, onClick, disabled }, idx) =>
      tooltip ? (
        <Tooltip title={tooltip} key={idx}>
          <span>
            <IconButton
              onClick={onClick}
              disabled={disabled}
              size="small"
              color="inherit"
            >
              {icon}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <IconButton
          key={idx}
          onClick={onClick}
          disabled={disabled}
          size="small"
          color="inherit"
        >
          {icon}
        </IconButton>
      ),
    )}
  </Box>
);
