// SectionDivider.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SectionDivider } from '../../components/Divider/SectionDivider';


const meta: Meta<typeof SectionDivider> = {
  title: 'Atoms/Divider',
  component: SectionDivider,
  args: {
    label: 'Novo por aqui?',
    width: '100%',
    thickness: 1,
    spacingY: 3,
  },
  argTypes: {
    width: { control: 'text' },
    thickness: { control: 'number' },
    spacingY: { control: 'number' },
  },
};
export default meta;

type Story = StoryObj<typeof SectionDivider>;
export const Playground: Story = {};
