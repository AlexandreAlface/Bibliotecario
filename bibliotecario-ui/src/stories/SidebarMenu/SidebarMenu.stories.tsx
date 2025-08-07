import type { Meta, StoryObj } from '@storybook/react';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { SidebarMenu } from '../../components/SidebarMenu';

const meta: Meta<typeof SidebarMenu> = {
  title: 'Organisms/SidebarMenu',
  component: SidebarMenu,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SidebarMenu>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Página Inicial', icon: <HomeIcon />, selected: true },
      { label: 'Sugestões de Leituras', icon: <MenuBookIcon /> },
      { label: 'Família & Crianças', icon: <ChildCareIcon /> },
    ],
    footerItems: [
      { label: 'Ajuda', icon: <HelpOutlineIcon /> },
      { label: 'Sair', icon: <LogoutIcon />, onClick: () => alert('logout') },
    ],
  },
};
