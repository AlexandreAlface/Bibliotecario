import type { Meta, StoryObj } from '@storybook/react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton, Chip } from '@mui/material';
import { SimpleDataTable } from '../../components/SimpleDataTable';

interface Consulta {
  id: number;
  bibliotecario: string;
  estado: 'Confirmada' | 'Pendente' | 'Recusada';
  data: string;
}

const rows: Consulta[] = Array.from({ length: 35 }, (_, i) => ({
  id: i + 1,
  bibliotecario: `Bibliotecário ${1 + (i % 3)}`,
  estado: ['Confirmada', 'Pendente', 'Recusada'][i % 3] as Consulta['estado'],
  data: '16/07/2025',
}));

const meta: Meta<typeof SimpleDataTable<Consulta>> = {
  title: 'Organisms/SimpleDataTable',
  component: SimpleDataTable,
  args: {
    columns: [
      { label: 'Nº Consulta', render: (r: Consulta) => `#${r.id}`, filterable: true },
      { label: 'Bibliotecário', field: 'bibliotecario', filterable: true },
      {
        label: 'Estado',
        filterable: true,
        render: (r: Consulta) => (
          <Chip
            size="small"
            label={r.estado}
            color={
              r.estado === 'Confirmada'
                ? 'success'
                : r.estado === 'Pendente'
                  ? 'warning'
                  : 'error'
            }
            variant="outlined"
          />
        ),
      },
      { label: 'Data/Hora', field: 'data', align: 'center', filterable: true },
      {
        label: 'Ações',
        align: 'center',
        render: () => (
          <>
            <IconButton size="small">
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        ),
      },
    ],
    rows,
  },
};

export default meta;
type Story = StoryObj<typeof meta.component>;
export const Default: Story = {};
