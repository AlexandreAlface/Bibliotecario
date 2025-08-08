// src/components/Paginator/Paginator.stories.tsx
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Paginator, PaginatorProps } from '../../components/Paginator';

const meta: Meta<PaginatorProps> = {
  title: 'Molecules/Paginator',
  component: Paginator,
  argTypes: {
    count:         { control: { type: 'number', min: 1, max: 50, step: 1 } },
    page:          { control: { type: 'number', min: 1, max: 50, step: 1 } },
    siblingCount:  { control: { type: 'number', min: 0, max: 4, step: 1 } },
    boundaryCount: { control: { type: 'number', min: 0, max: 4, step: 1 } },
    showFirstButton:{ control: 'boolean' },
    showLastButton: { control: 'boolean' },
    onChange:      { action: 'pageChanged' },
  },
};
export default meta;
type Story = StoryObj<PaginatorProps>;

export const Controlled: Story = {
  render: (args) => {
    const [page, setPage] = useState(args.page || 1);
    return (
      <Paginator
        {...args}
        page={page}
        onChange={(e, p) => {
          setPage(p);
          args.onChange?.(e, p);
        }}
      />
    );
  },
  args: {
    count: 10,
    page: 1,
    siblingCount: 1,
    boundaryCount: 1,
    showFirstButton: false,
    showLastButton: false,
  },
};

export const Uncontrolled: Story = {
  args: {
    count: 5,
    // sem `page` nem `onChange`, o MUI gere internamente
  },
};

export const WithFirstLast: Story = {
  render: (args) => {
    const [page, setPage] = useState(1);
    return (
      <Paginator
        {...args}
        page={page}
        onChange={(e, p) => setPage(p)}
      />
    );
  },
  args: {
    count: 20,
    page: 1,
    siblingCount: 2,
    boundaryCount: 1,
    showFirstButton: true,
    showLastButton: true,
  },
};
