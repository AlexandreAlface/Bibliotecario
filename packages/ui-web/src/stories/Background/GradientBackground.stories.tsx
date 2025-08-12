import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from '@mui/material';
import { GradientBackground } from '../../components/Background';

const meta: Meta<typeof GradientBackground> = {
  title: 'Atoms/Background/Gradient',
  component: GradientBackground,
  args: { children: <Typography variant="h3">Demo</Typography> },
  argTypes: {
    from: { control: 'color' },
    to: { control: 'color' },
    angle: { control: { type: 'number', min: 0, max: 360 } },
  },
};
export default meta;
export const Default: StoryObj<typeof GradientBackground> = {};
