import type { Meta, StoryObj } from '@storybook/react';
import { SecondaryButton } from '../../Buttons';

const meta: Meta<typeof SecondaryButton> = {
  component: SecondaryButton,
  title: 'Atoms/Button/Secondary',
  args: { children: 'Criar conta' },
};
export default meta;

type Story = StoryObj<typeof SecondaryButton>;
export const Default: Story = {};
