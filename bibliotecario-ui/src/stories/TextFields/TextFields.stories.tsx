import type { Meta, StoryObj } from '@storybook/react';
import { EmailField, NumericField, PasswordField } from '../../TextFields';


const meta: Meta = {
  title: 'Atoms/TextField',
  component: EmailField,          // referência para type-safety
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
