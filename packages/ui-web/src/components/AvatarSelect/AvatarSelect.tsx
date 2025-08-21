// packages/ui-web/src/components/AvatarSelect/AvatarSelect.tsx
import * as React from "react";
import {
  Avatar,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  SxProps,
  Theme,
} from "@mui/material";

export type AvatarOption = {
  id: string;
  nome: string;
  avatar?: string;
};

export interface AvatarSelectProps {
  label?: string;
  options: AvatarOption[];
  value?: string;
  onChange?: (id: string) => void;
  minWidth?: number;
  sx?: SxProps<Theme>;
}

export const AvatarSelect: React.FC<AvatarSelectProps> = ({
  label,
  options,
  value,
  onChange,
  minWidth = 200,
  sx,
}) => {
  const labelId = React.useId();

  const selected = options.find((o) => String(o.id) === String(value));

  return (
    <FormControl size="small" sx={{ minWidth, ...sx }}>
      {label && <InputLabel id={labelId}>{label}</InputLabel>}

      <Select
        labelId={label ? labelId : undefined}
        label={label}
        value={value ?? ""}
        onChange={(e) => onChange?.(String(e.target.value))}
        renderValue={(selectedId) => {
          const opt = options.find((o) => String(o.id) === String(selectedId));
          if (!opt) return "";
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ width: 24, height: 24 }} src={opt.avatar}>
                {opt.nome?.[0]?.toUpperCase()}
              </Avatar>
              <span>{opt.nome}</span>
            </Stack>
          );
        }}
        MenuProps={{ disablePortal: true }} // opcional: menos flicker/SSR
      >
        {options.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {/* NÃO usar <ListItem> aqui; evitar <li> dentro de <li> */}
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Avatar sx={{ width: 24, height: 24 }} src={o.avatar}>
                {o.nome?.[0]?.toUpperCase()}
              </Avatar>
            </ListItemIcon>
            <ListItemText primary={o.nome} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
