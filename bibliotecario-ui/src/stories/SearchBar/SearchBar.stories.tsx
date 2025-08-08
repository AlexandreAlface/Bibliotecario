// src/components/SearchBar/SearchBar.stories.tsx
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar, SearchBarProps } from '../../components/SearchBar';

const meta: Meta<SearchBarProps> = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  argTypes: {
    value:        { control: 'text' },
    onChange:     { action: 'changed' },
    onSearch:     { action: 'searched' },
    placeholder:  { control: 'text' },
    textFieldProps: { table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<SearchBarProps>;

export const Default: Story = {
  render: args => {
    const [val, setVal] = useState('');
    return (
      <div style={{ width: 300 }}>
        <SearchBar
          {...args}
          value={val}
          onChange={v => {
            setVal(v);
            args.onChange?.(v);
          }}
          onSearch={v => args.onSearch?.(v)}
        />
      </div>
    );
  },
  args: {
    placeholder: 'Pesquisar eventos…',
  },
};

export const WithInitialValue: Story = {
  ...Default,
  args: {
    ...Default.args,
    value: 'Beja',
  },
};
