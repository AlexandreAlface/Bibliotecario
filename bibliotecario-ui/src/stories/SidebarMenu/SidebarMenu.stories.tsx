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
  argTypes: {
    toggleVertical: {
      control: {
        type: 'radio',
        options: ['top', 'center', 'bottom'],
      },
      description: 'Posição vertical do “handle”',
      table: { defaultValue: { summary: 'center' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SidebarMenu>;

const baseItems = [
  { label: 'Página Inicial', icon: <HomeIcon />, selected: true },
  { label: 'Sugestões de Leituras', icon: <MenuBookIcon /> },
  { label: 'Família & Crianças', icon: <ChildCareIcon /> },
];
const baseFooter = [
  { label: 'Ajuda', icon: <HelpOutlineIcon /> },
  { label: 'Sair', icon: <LogoutIcon />, onClick: () => alert('logout') },
];

export const Centro: Story = {
  args: {
    items: baseItems,
    footerItems: baseFooter,
    toggleVertical: 'center', // default
  },
};

export const Topo: Story = {
  args: {
    items: baseItems,
    footerItems: baseFooter,
    toggleVertical: 'top',
  },
};

export const Fundo: Story = {
  args: {
    items: baseItems,
    footerItems: baseFooter,
    toggleVertical: 'bottom',
  },
};
