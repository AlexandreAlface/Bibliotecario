// src/components/Table/ColumnFilterPopper.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  ClickAwayListener,
  IconButton,
  MenuItem,
  Popper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import DoneIcon from '@mui/icons-material/Done';

interface Props<T = any> {
  open: boolean;
  anchorEl: HTMLElement | null;
  values: T[];
  selected: Set<T>;
  onClose: () => void;
  onApply: (set: Set<T>) => void;
}

export function ColumnFilterPopper<T>({
  open,
  anchorEl,
  values,
  selected,
  onClose,
  onApply,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState<Set<T>>(new Set(selected));

  useEffect(() => {
    if (open) setLocal(new Set(selected));
  }, [open, selected]);

  const list = useMemo(
    () =>
      values.filter((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [values, query],
  );

  const toggle = (v: T) => {
    const next = new Set(local);
    next.has(v) ? next.delete(v) : next.add(v);
    setLocal(next);
  };

  return (
    <Popper open={open} anchorEl={anchorEl} placement="bottom-start">
      <ClickAwayListener onClickAway={onClose}>
        <Box
          bgcolor="#fff"
          borderRadius={1}
          boxShadow={3}
          p={2}
          maxHeight={300}
          overflow="auto"
          minWidth={220}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">Filtrar</Typography>
            <IconButton size="small" onClick={() => setLocal(new Set())}>
              <ClearIcon fontSize="inherit" />
            </IconButton>
          </Stack>

          <TextField
            size="small"
            placeholder="Pesquisar…"
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ mb: 1 }}
          />

          {list.map((v) => (
            <MenuItem key={String(v)} onClick={() => toggle(v)}>
              <Checkbox size="small" checked={local.has(v)} sx={{ mr: 1 }} />
              {String(v ?? '—')}
            </MenuItem>
          ))}

          <Box textAlign="right" mt={1}>
            <IconButton size="small" color="primary" onClick={() => (onApply(local), onClose())}>
              <DoneIcon fontSize="inherit" />
            </IconButton>
          </Box>
        </Box>
      </ClickAwayListener>
    </Popper>
  );
}
