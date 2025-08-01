import type { Meta, StoryObj } from '@storybook/react';
import { EmailField, NumericField, PasswordField } from '../../TextFields';


const meta: Meta<typeof EmailField> = {
  title: 'Atoms/TextField',
  component: EmailField,
  args: { radius: 3, px: 2, py: 1.5 },
  argTypes: {
    radius: { control: { type: 'number', min: 0, max: 8 } },
    px: { control: { type: 'number', min: 1, max: 6, step: 0.5 } },
    py: { control: { type: 'number', min: 1, max: 4, step: 0.5 } },
  },
};
export default meta;

type Story = StoryObj;

export const Email: Story = {
  render: () => <EmailField />,
};

export const Numeric: Story = {
  render: () => <NumericField />,
};

export const Password: Story = {
  render: () => <PasswordField />,
};
