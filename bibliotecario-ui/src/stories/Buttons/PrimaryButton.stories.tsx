import type { Meta, StoryObj } from '@storybook/react';
import { PrimaryButton } from '../../Buttons';

const meta: Meta<typeof PrimaryButton> = {
  title: 'Atoms/Button',          // <-- igual nos dois
  component: PrimaryButton,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof PrimaryButton>;

export const Primary: Story = {
  args: { children: 'Entrar' },
};

