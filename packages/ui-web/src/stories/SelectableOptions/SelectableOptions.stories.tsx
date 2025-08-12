// bibliotecario-ui/stories/SelectableOptions.stories.tsx
import type { Meta, StoryObj, StoryFn } from '@storybook/react';
import { SelectableOptions, SelectableOptionsProps } from '../../components/SelectableOptions';
import { useArgs } from 'storybook/internal/preview-api';


const meta: Meta<typeof SelectableOptions> = {
  title: 'Molecules/SelectableOptions',
  component: SelectableOptions,
  argTypes: {
    onChange: { action: 'changed' },   // continua a aparecer no painel Actions
  },
};
export default meta;

/* ────────── Template controlado ────────── */
const Template: StoryFn<typeof SelectableOptions> = (initialArgs) => {
  /* args = estado actual  |  updateArgs = setter */
  const [args, updateArgs] = useArgs<SelectableOptionsProps>();

  return (
    <SelectableOptions
      {...args}
      onChange={(val) => {
        /* 1. actualiza o *value* para o Storybook "ver" */
        updateArgs({ value: val });
        /* 2. dispara a action no painel de Actions */
        initialArgs.onChange?.(val);
      }}
    />
  );
};

/* ---------- Histórias ---------- */
export const RadioHorizontal: StoryObj<typeof SelectableOptions> = {
  render: Template,
  args: {
    label: 'Género',
    variant: 'radio',
    row: true,
    options: [
      { value: 'M', label: 'Masculino' },
      { value: 'F', label: 'Feminino' },
    ],
    value: 'M',
  },
};

export const CheckboxVertical: StoryObj<typeof SelectableOptions> = {
  render: Template,
  args: {
    label: 'Interesses',
    variant: 'checkbox',
    row: false,
    options: [
      { value: 'leitura', label: 'Leitura' },
      { value: 'desporto', label: 'Desporto' },
      { value: 'música', label: 'Música' },
    ],
    value: ['leitura'],
  },
};
