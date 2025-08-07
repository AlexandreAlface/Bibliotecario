// src/components/SidebarMenu/SidebarMenu.tsx
import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Divider,
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
import { SidebarToggle, VerticalPos } from './SidebarToggle';


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
  toggleVertical?: VerticalPos;
  sx?: SxProps<Theme>;
}

/* ---------- Constantes ---------- */
const OPEN = 260;
const CLOSED = 64;

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
  toggleVertical = 'center',
  sx,
}) => {
  const [internal, setInternal] = useState(true);
  const open = controlled ?? internal;
  const toggle = () => (onToggle ? onToggle(!open) : setInternal(!open));

  const render = (arr: MenuItem[]) =>
    arr.map(({ label, icon, selected, ...rest }) => (
      <Tooltip
        key={label}
        title={!open ? label : ''}
        placement="right"
        arrow
        disableInteractive
      >
        <ListItemButton
          sx={{
            my: 0.5,
            borderRadius: 1,
            px: open ? 2 : 0,            // sem “padding” lateral quando fechado
            justifyContent: open ? 'flex-start' : 'center',
            ...(selected && selectedSX),
            }}
          {...rest}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 2 : '0',
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
    <>
      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            width: open ? OPEN : CLOSED,
            overflowX: 'clip', // evita barra horizontal
            borderRadius: '0 8px 8px 0',
            boxShadow: '0 4px 24px rgba(0,0,0,.08)',
            transition: (t) =>
              t.transitions.create('width', {
                duration: t.transitions.duration.shorter,
              }),
            display: 'flex',
            flexDirection: 'column',
            ...sx,
          },
        }}
      >
        {/* ---------- Header ---------- */}
        <Stack position="relative" alignItems="center" spacing={1} mt={3} mb={2}>
          <Box
            component="img"
            src="https://placehold.co/40"
            width={40}
            height={40}
            borderRadius="50%"
          />
          {open && (
            <>
              <Typography fontWeight={700} fontSize={14}>
                Alexandre Brissos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                TUTOR
              </Typography>
              <Divider sx={{ width: '100%', mt: 1 }} />
            </>
          )}
        </Stack>

        {/* ---------- Itens ---------- */}
        <List disablePadding sx={{ px: open ? 1 : 0 }}>
          {render(items)}
        </List>

        {/* ---------- Rodapé ---------- */}
        {!!footerItems?.length && (
          <Box mt="auto" pb={2}>
            <List disablePadding sx={{ px: open ? 1 : 0 }}>
              {render(footerItems)}
            </List>
          </Box>
        )}
      </Drawer>

      {/* ---------- Handle ---------- */}
      <SidebarToggle
        open={open}
        openWidth={OPEN}
        closedWidth={CLOSED}
        vertical={toggleVertical}
        onToggle={toggle}
      />
    </>
  );
};
