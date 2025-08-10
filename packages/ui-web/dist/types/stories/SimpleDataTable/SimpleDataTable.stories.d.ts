import type { Meta, StoryObj } from '@storybook/react';
import { SimpleDataTable } from '../../components/SimpleDataTable';
interface Consulta {
    id: number;
    bibliotecario: string;
    estado: 'Confirmada' | 'Pendente' | 'Recusada';
    data: string;
}
declare const meta: Meta<typeof SimpleDataTable<Consulta>>;
export default meta;
type Story = StoryObj<typeof meta.component>;
export declare const Default: Story;
