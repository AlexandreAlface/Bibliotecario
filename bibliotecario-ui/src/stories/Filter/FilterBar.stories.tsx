// src/components/FilterBar/FilterBar.stories.tsx
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FilterBar,
  FilterBarProps,
  FilterDefinition
} from '../../components/Filter';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';

const demoFilters: FilterDefinition[] = [
  {
    id: 'date',
    label: 'Data/Hora',
    options: [
      { value: 'today',    label: 'Hoje' },
      { value: 'tomorrow', label: 'Amanhã' },
      { value: 'weekend',  label: 'Fim de Semana' },
    ],
  },
  {
    id: 'location',
    label: 'Local',
    options: [
      { value: 'beja',   label: 'Biblioteca Beja' },
      { value: 'evora',  label: 'Biblioteca Évora' },
      { value: 'lisboa', label: 'Biblioteca Lisboa' },
    ],
  },
  {
    id: 'type',
    label: 'Tipo',
    options: [
      { value: 'evento',    label: 'Evento' },
      { value: 'workshop',  label: 'Workshop' },
      { value: 'exposicao', label: 'Exposição' },
    ],
  },
];

const meta: Meta<FilterBarProps> = {
  title: 'Molecules/FilterBar',
  component: FilterBar,
  argTypes: {
    filters:  { control: false },
    selected: { control: false },
    onChange: { control: false },
  },
};
export default meta;
type Story = StoryObj<FilterBarProps>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<Record<string, string[]>>({});
    return (
      <FilterBar
        filters={demoFilters}
        selected={selected}
        onChange={(fid, vals) => setSelected(s => ({ ...s, [fid]: vals }))}
        icons={{
          date:     <EventIcon fontSize="small" />,
          location: <LocationOnIcon fontSize="small" />,
          type:     <CategoryIcon fontSize="small" />,
        }}
        chipIcons={{
          date:     <EventIcon />,
          location: <LocationOnIcon />,
          type:     <CategoryIcon />,
        }}
      />
    );
  },
};
