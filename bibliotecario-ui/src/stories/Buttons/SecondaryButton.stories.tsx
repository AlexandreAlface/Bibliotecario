import type { Meta, StoryObj } from '@storybook/react';
import { SecondaryButton } from '../../Buttons';

const meta: Meta<typeof SecondaryButton> = {
  title: 'Atoms/Button/Secondary',
  component: SecondaryButton,
  args: {
    children: 'Criar conta',
    radius: 4,     // 32 px
    px: 3,         // theme.spacing(3) = 24 px
    fullWidth: false,
  },
  argTypes: {
    radius: {
      control: { type: 'number', min: 0, max: 8, step: 1 },
      description: 'Raio de canto em unidades de theme.spacing',
    },
    px: {
      control: { type: 'number', min: 1, max: 6, step: 1 },
      description: 'Padding horizontal em unidades de theme.spacing',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ocupar toda a largura do contêiner',
    },
    children: {
      control: 'text',
      description: 'Texto do botão',
    },
  },
};
export default meta;

type Story = StoryObj<typeof SecondaryButton>;

export const Default: Story = {};

export const FullWidth: Story = {
  args: { fullWidth: true },
};

export const LargeRadius: Story = {
  args: { radius: 20 },
};

export const ExtraPadding: Story = {
  args: { px: 5 },
};
