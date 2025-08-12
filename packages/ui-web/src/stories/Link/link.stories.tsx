import type { Meta, StoryObj } from '@storybook/react';
import { RouteLink } from '../../components/Link';

const meta: Meta<typeof RouteLink> = {
  title: 'Atoms/Link',
  component: RouteLink,
  args: { children: 'Problemas ao entrar?', href: '#' },
  argTypes: {
    underlineThickness: { control: { type: 'number', min: 1, max: 4 } },
    weight: { control: { type: 'number', min: 400, max: 700, step: 100 } },
  },
};
export default meta;

type Story = StoryObj<typeof RouteLink>;
export const Default: Story = {};
export const Bold: Story = { args: { weight: 600 } };
export const ThickUnderline: Story = { args: { underlineThickness: 2 } };
