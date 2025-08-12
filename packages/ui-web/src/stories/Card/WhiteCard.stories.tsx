// WhiteCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';

import { Typography } from '@mui/material';
import { WhiteCard } from '../../components/Card/WhiteCard';

const meta: Meta<typeof WhiteCard> = {
  title: 'Atoms/Card',
  component: WhiteCard,
  args: {
    width: 420,
    height: 560,
    children: (
      <Typography variant="h5" textAlign="center">
        Content here
      </Typography>
    ),
  },
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof WhiteCard>;
export const Default: Story = {};

export const Fluid: Story = {
  args: { width: '80%', height: undefined },
};
