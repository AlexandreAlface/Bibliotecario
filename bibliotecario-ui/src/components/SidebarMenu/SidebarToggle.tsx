// src/components/SidebarMenu/SidebarToggle.tsx
import React from 'react';
import { IconButton, styled } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export type VerticalPos = 'top' | 'center' | 'bottom' | number;

interface Props {
  open: boolean;
  openWidth: number;
  closedWidth: number;
  onToggle: () => void;
  vertical?: VerticalPos;          // ← NOVO
}

const Handle = styled(IconButton)({
  position: 'fixed',
  transform: 'translate(-50%, -50%)',
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: '#fff',
  border: '1px solid #E0E0E0',
  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
  zIndex: 1301,
  '&:hover': { background: '#fff' },
});

const getTop = (v: VerticalPos): string | number => {
  if (typeof v === 'number') return v;
  if (v === 'top') return 40;                     // 40 px do topo
  if (v === 'bottom') return 'calc(100% - 40px)'; // 40 px do fundo
  return '50%';                                   // center (default)
};

export const SidebarToggle: React.FC<Props> = ({
  open,
  openWidth,
  closedWidth,
  onToggle,
  vertical = 'center',
}) => (
  <Handle
    onClick={onToggle}
    sx={{
      left: open ? openWidth : closedWidth,
      top: getTop(vertical),
    }}
  >
    {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
  </Handle>
);
