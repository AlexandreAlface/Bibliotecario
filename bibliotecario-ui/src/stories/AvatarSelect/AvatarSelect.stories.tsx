import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Avatar } from '@mui/material';
import { AvatarSelect, ChildOption } from '../../components/AvatarSelect';

const meta: Meta<typeof AvatarSelect> = {
  title: 'Molecules/AvatarSelect',
  component: AvatarSelect,
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof AvatarSelect>;

const crianças: ChildOption[] = [
  { id: '1', nome: 'Camila', avatar: 'https://placehold.co/32x32' },
  { id: '2', nome: 'Tomé',   avatar: 'https://placehold.co/32x32' },
  { id: '3', nome: 'Matilde',avatar: 'https://placehold.co/32x32' },
];

export const ComPlaceholderLogo: Story = {
  render: () => {
    const [sel, setSel] = useState<string>('');

    return (
      <div style={{ width: 260 }}>
        <AvatarSelect
          label="Escolher Criança"
          options={crianças}
          value={sel}
          onChange={setSel}
          minWidth="100%"
          /* ----------- avatar de placeholder ----------- */
          placeholderAvatar={
            <Avatar
              src="https://placehold.co/24x24?text=B"  /* mete aqui o teu logo */
              sx={{ width: 24, height: 24 }}
            />
          }
        />
      </div>
    );
  },
};
