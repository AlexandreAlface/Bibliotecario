import React from 'react';
import {
  Avatar,
  Box,
  FormControl,
  InputLabel,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export interface ChildOption {
  id: string;
  nome: string;
  avatar?: string;
}

export interface AvatarSelectProps {
  label: string;
  options: ChildOption[];
  value: string | '';
  onChange: (id: string) => void;
  disabled?: boolean;
  /** ReactNode para o avatar de placeholder (default ícone pessoa) */
  placeholderAvatar?: React.ReactNode;
  /** Largura mínima, útil em <Stack spacing> */
  minWidth?: number | string;
}

export const AvatarSelect: React.FC<AvatarSelectProps> = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholderAvatar,
  minWidth,
}) => {
  const current = options.find((o) => o.id === value);

  /* devolve só o id */
  const handle = (e: SelectChangeEvent<string>) => onChange(e.target.value);

  const Placeholder = (
    <Box display="flex" alignItems="center" gap={1} color="text.secondary">
      <Avatar sx={{ width: 24, height: 24, bgcolor: '#E0E0E0' }}>
        {placeholderAvatar ?? <PersonOutlineIcon fontSize="small" />}
      </Avatar>
      {label}
    </Box>
  );

  return (
    <FormControl
      fullWidth
      variant="standard"
      disabled={disabled}
      sx={{ minWidth }}
    >
      <InputLabel shrink>{label}</InputLabel>

      <Select
        value={value}
        onChange={handle}
        renderValue={() =>
          value && current ? (
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar src={current.avatar} sx={{ width: 24, height: 24 }}>
                {current.nome[0]}
              </Avatar>
              {current.nome}
            </Box>
          ) : (
            Placeholder
          )
        }
      >
        {options.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            <ListItem disableGutters>
              <ListItemAvatar sx={{ minWidth: 32 }}>
                <Avatar src={o.avatar} sx={{ width: 32, height: 32, marginRight: '1em' }}>
                  {o.nome[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={o.nome} />
            </ListItem>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
