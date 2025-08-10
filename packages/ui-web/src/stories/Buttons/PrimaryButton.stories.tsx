import type { Meta, StoryObj } from '@storybook/react';
import { PrimaryButton } from '../../components/Buttons';


export default {
  title: 'Atoms/Button',
  component: PrimaryButton,
  argTypes: {
    radius: { control: { type: 'number', min: 0, max: 8 } },
    px: { control: { type: 'number', min: 1, max: 6 } },
    fullWidth: { control: 'boolean' },
  },
} as Meta;

type Story = StoryObj<typeof PrimaryButton>;

export const Primary: Story = {
  args: { children: 'Entrar' },
};

