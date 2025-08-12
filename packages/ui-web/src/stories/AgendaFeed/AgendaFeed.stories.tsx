import type { Meta, StoryObj } from '@storybook/react';
import { AgendaFeed, AgendaFeedProps } from '../../components/AgendaFeed';
import { PrimaryButton } from '../../components/Buttons';

const meta: Meta<AgendaFeedProps> = {
  title: 'Organisms/AgendaFeed',
  component: AgendaFeed,
  argTypes: {
    feedUrl: { control: 'text' },
    columns: { control: { type: 'number', min: 1, max: 4, step: 1 } },
    actions: { table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<AgendaFeedProps>;

export const Default: Story = {
  args: {
    feedUrl: 'https://cm-beja.pt/feeds/agenda',
    columns: 1,
  },
};

export const ThreeColumns: Story = {
  args: {
    feedUrl: 'https://cm-beja.pt/feeds/agenda',
    columns: 3,
  },
};

export const CustomAction: Story = {
  args: {
    feedUrl: 'https://cm-beja.pt/feeds/agenda',
    columns: 2,
    actions: (item) => (
      <PrimaryButton variant="outlined" size="small" onClick={() => alert(item.title)}>
        ALERTAR
      </PrimaryButton>
    ),
  },
};
