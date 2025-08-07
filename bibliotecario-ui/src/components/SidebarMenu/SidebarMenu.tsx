import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/* ---------- Tipos ---------- */
export interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export interface SidebarMenuProps {
  items: MenuItem[];
  footerItems?: MenuItem[];
  open?: boolean;
  onToggle?: (open: boolean) => void;
  sx?: SxProps<Theme>;
}

/* ---------- Constantes de estilo ---------- */
const OPEN = 260;
const CLOSED = 64;

/* cor da linha seleccionada */
const selectedSX = {
  bgcolor: '#EEF3FF',
  '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
    color: 'primary.main',
    fontWeight: 600,
  },
};

/* ---------- Componente ---------- */
export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  items,
  footerItems,
  open: controlled,
  onToggle,
  sx,
}) => {
  const [internal, setInternal] = useState(true);
  const open = controlled ?? internal;
  const toggle = () => (onToggle ? onToggle(!open) : setInternal(!open));

  /* render helper */
  const render = (arr: MenuItem[]) =>
    arr.map(({ label, icon, selected, ...rest }) => (
      <Tooltip key={label} title={!open ? label : ''} placement="right" arrow disableInteractive>
        <ListItemButton
          sx={{ px: 2, my: 0.5, borderRadius: 1, ...(selected && selectedSX) }}
          {...rest}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 2 : 'auto',
              justifyContent: 'center',
            }}
          >
            {icon}
          </ListItemIcon>
          {open && <ListItemText primary={label} />}
        </ListItemButton>
      </Tooltip>
    ));

  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          width: open ? OPEN : CLOSED,
          overflowX: 'visible',
          borderRadius: '0 8px 8px 0',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          transition: (t) =>
            t.transitions.create('width', { duration: t.transitions.duration.shorter }),
          display: 'flex',
          flexDirection: 'column',
          ...sx,
        },
      }}
    >
      {/* Botão flutuante */}
      <IconButton
        size="small"
        onClick={toggle}
        sx={{
          position: 'absolute',
          top: 12,
          right: -16,
          transform: 'translateX(50%)',
          bgcolor: '#fff',
          border: '1px solid #E0E0E0',
          boxShadow: 1,
          zIndex: 1,
          '&:hover': { bgcolor: '#fff' },
        }}
      >
        {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>

      {/* Header */}
      <Stack alignItems="center" spacing={open ? 1 : 0} mt={3} mb={2}>
        <Box
          component="img"
          src="https://placehold.co/40x40/000/fff" // troca pelo avatar real
          width={40}
          height={40}
          borderRadius="50%"
        />
        {open && (
          <>
            <Stack spacing={0} alignItems="center">
              <Typography fontWeight={700} fontSize={14}>
                Alexandre Brissos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                TUTOR
              </Typography>
            </Stack>
            <Divider sx={{ width: '100%', mt: 1 }} />
          </>
        )}
      </Stack>

      {/* Itens principais */}
      <List disablePadding sx={{ px: open ? 1 : 0 }}>{render(items)}</List>

      {/* Rodapé */}
      {!!footerItems?.length && (
        <Box mt="auto" pb={2}>
          <List disablePadding sx={{ px: open ? 1 : 0 }}>{render(footerItems)}</List>
        </Box>
      )}
    </Drawer>
  );
};
