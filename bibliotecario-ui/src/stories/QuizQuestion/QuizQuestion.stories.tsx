import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { QuizQuestion } from '../../components/QuizQuestion';

const meta: Meta<typeof QuizQuestion> = {
  title: 'Molecules/QuizQuestion',
  component: QuizQuestion,
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof QuizQuestion>;

export const FaixaEtaria: Story = {
  render: () => {
    const [sel, setSel] = useState<string | number>('');
    return (
      <QuizQuestion
        pergunta="Qual a faixa etária da criança?"
        topoIcon="A"
        opcoes={[
          { label: '0–3', value: '0-3' },
          { label: '4–6', value: '4-6' },
          { label: '7–10', value: '7-10' },
          { label: '11–14', value: '11-14' },
        ]}
        valor={sel}
        onChange={setSel}
      />
    );
  },
};
