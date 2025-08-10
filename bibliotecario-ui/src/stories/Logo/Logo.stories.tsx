// src/components/Logo/Logo.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Logo, LogoProps } from '../../components/Logo/Logo';

const meta: Meta<LogoProps> = {
  title: 'Components/Logo',
  component: Logo,
  argTypes: {
    width:  { control: 'text' },
    height: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<LogoProps>;

export const Default: Story = {
  args: {
    width: '120px',
    height: 'auto',
  },
};
export const Large: Story = {
  args: {
    width: '200px',
    height: '200px',
  },
};
