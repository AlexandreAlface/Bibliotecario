import type { Meta, StoryObj } from '@storybook/react';
import Face6RoundedIcon from '@mui/icons-material/Face6Rounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AvatarListItem } from '../../components/AvatarListItem';

const meta: Meta<typeof AvatarListItem> = {
  title: 'Molecules/AvatarListItem',
  component: AvatarListItem,
  argTypes: {
    sx: { control: false },
  },
};
export default meta;

type Story = StoryObj<typeof AvatarListItem>;

export const Default: Story = {
  args: {
    avatarSrc:
      'https://avatars.dicebear.com/api/avataaars/camila.svg?background=%23FFE0E0',
    label: 'Camila, 7 anos',
  },
};

export const CustomActions: Story = {
  args: {
    avatarSrc:
      'https://avatars.dicebear.com/api/avataaars/jose.svg?background=%23E0FFEE',
    label: 'José, 10 anos',
    actions: [
      {
        icon: <VisibilityIcon />,
        tooltip: 'Ver perfil',
        onClick: () => alert('Ver perfil!'),
      },
      {
        icon: <Face6RoundedIcon />,
        tooltip: 'Alterar avatar',
        onClick: () => alert('Alterar avatar!'),
      },
    ],
  },
};
