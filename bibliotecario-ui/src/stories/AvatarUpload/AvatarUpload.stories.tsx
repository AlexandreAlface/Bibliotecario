import type { Meta, StoryObj, StoryFn } from '@storybook/react';
import { AvatarUpload } from '../../components/AvatarUpload';
import { useArgs } from 'storybook/internal/preview-api';


const meta: Meta<typeof AvatarUpload> = {
  title: 'Atoms/AvatarUpload',
  component: AvatarUpload,
  argTypes: {
    onChange: { action: 'changed' },
    sx: { control: false },
  },
  args: { size: 128 },
};
export default meta;

/* controlled story */
const Template: StoryFn<typeof AvatarUpload> = (initialArgs) => {
  const [args, updateArgs] = useArgs();
  return (
    <AvatarUpload
      {...args}
      onChange={(file, url) => {
        updateArgs({ value: url });
        initialArgs.onChange?.(file, url);
      }}
    />
  );
};

export const Default: StoryObj<typeof AvatarUpload> = {
  render: Template,
};
