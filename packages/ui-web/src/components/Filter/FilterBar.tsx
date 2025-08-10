// src/components/FilterBar/FilterBar.tsx
import React, { useState, ReactElement } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface FilterBarProps {
  filters: FilterDefinition[];
  selected: Record<string, string[]>;
  onChange: (filterId: string, values: string[]) => void;
  icons?: Record<string, ReactElement>;
  chipIcons?: Record<string, ReactElement>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  selected,
  onChange,
  icons = {},
  chipIcons = {}
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLElement>, filterId: string) => {
    setAnchorEl(e.currentTarget);
    setActiveFilter(filterId);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };

  const handleOptionClick = (value: string) => {
    if (!activeFilter) return;
    const curr = selected[activeFilter] || [];
    const next = curr.includes(value)
      ? curr.filter(v => v !== value)
      : [...curr, value];
    onChange(activeFilter, next);
  };

  const handleDeleteChip = (filterId: string, value: string) => {
    const curr = selected[filterId] || [];
    onChange(filterId, curr.filter(v => v !== value));
  };

  return (
    <Box>
      {/* Botões de filtros */}
      <Box display="flex" gap={1} mb={1}>
        {filters.map(f => (
          <Button
            key={f.id}
            variant="contained"
            size="small"
            onClick={e => openMenu(e, f.id)}
            startIcon={icons[f.id]}
            endIcon={<ArrowDropDownIcon />}
            sx={{
              backgroundColor: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
            }}
          >
            {f.label}
          </Button>
        ))}
      </Box>

      {/* Divider */}
      <Divider sx={{ mb: 1 }} />

      {/* Chips das selecções */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        {Object.entries(selected).flatMap(([filterId, vals]) =>
          vals.map(val => {
            const def = filters.find(f => f.id === filterId)!;
            const label = def.options.find(o => o.value === val)?.label || val;
            const key = `${filterId}-${val}`;

            // Extrai um único ReactElement ou undefined
            const chipIcon: ReactElement | undefined = chipIcons[filterId];

            return (
              <Chip
                key={key}
                label={label}
                size="small"
                onDelete={() => handleDeleteChip(filterId, val)}
                deleteIcon={<CloseIcon />}
                icon={chipIcon}
                sx={{
                  backgroundColor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                }}
              />
            );
          })
        )}
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
      >
        {activeFilter && filters
          .find(f => f.id === activeFilter)!
          .options.map(opt => {
            const isSelected = (selected[activeFilter] || []).includes(opt.value);
            return (
              <MenuItem
                key={opt.value}
                selected={isSelected}
                onClick={() => handleOptionClick(opt.value)}
              >
                {opt.label}
                {isSelected && <CloseIcon fontSize="small" sx={{ ml: 1 }} />}
              </MenuItem>
            );
          })
        }
      </Menu>
    </Box>
  );
};
