import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NotificationBell, NotificationItem } from '../../components/NotificationBell/NotificationBell';

const meta: Meta<typeof NotificationBell> = {
  title: 'Atoms/NotificationBell',
  component: NotificationBell,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof NotificationBell>;

const exemplo: NotificationItem[] = [
  { id: '1', titulo: 'Novo livro disponível', mensagem: '“Os Maias” está agora em stock' },
  { id: '2', titulo: 'Lembrete de devolução', mensagem: 'Falta 1 dia para entregar', lida: true },
  { id: '3', titulo: 'Pontuação de gamificação', mensagem: '+50 pts!', lida: false },
];

export const Default: Story = {
  render: () => {
    const [items, setItems] = useState<NotificationItem[]>(exemplo);

    return (
      <NotificationBell
        items={items}
        onSelect={(n) => {
          alert(`Clicaste: ${n.titulo}`);
          setItems((prev) =>
            prev.map((i) => (i.id === n.id ? { ...i, lida: true } : i)),
          );
        }}
        onRemove={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
        onClearAll={() => setItems([])}
      />
    );
  },
};
