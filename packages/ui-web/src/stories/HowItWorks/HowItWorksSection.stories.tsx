import type { Meta, StoryObj } from '@storybook/react';
import { HowItWorksSection } from '../../components/HowItWorks';

const meta: Meta<typeof HowItWorksSection> = {
  title: 'Atoms/Sections/HowItWorksSection',
  component: HowItWorksSection,
  args: {
    steps: [
      {
        step: 1,
        title: 'Dados da Família',
        description:
          'Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.',
        accentColor: '#7A44BD',
        backgroundColor: 'rgba(122,68,189,0.08)',
      },
      {
        step: 2,
        title: 'Perfil das Crianças',
        description:
          'Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.',
        accentColor: '#C09CDC',
        backgroundColor: 'rgba(192,156,220,0.12)',
      },
    ],
    orientation: 'vertical',
    spacing: 6,
  },
  argTypes: {
    orientation: {
      control: { type: 'radio', options: ['vertical', 'horizontal'] },
      description: 'Direcção de empilhamento dos cartões',
    },
    spacing: {
      control: { type: 'number', min: 0, max: 12, step: 1 },
      description: 'Espaçamento entre cartões (theme.spacing)',
    },
    steps: { table: { disable: true } }, // editar arrays de objectos no Storybook é chato…
  },
};
export default meta;

type Story = StoryObj<typeof HowItWorksSection>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};
