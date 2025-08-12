import type { Meta, StoryObj } from '@storybook/react';
import { InfoStepCard } from '../../components/StepCard';

const meta: Meta<typeof InfoStepCard> = {
  title: 'Atoms/StepCard/InfoStepCard',
  component: InfoStepCard,
  args: {
    step: 1,
    title: 'Dados da Família',
    description:
      'Diz-nos quem és! Indica o teu nome, contacto e morada da família para te recebermos de braços abertos.',
    accentColor: '#7A44BD',
    backgroundColor: 'rgba(122,68,189,0.08)',
    circleSize: 88,
    circleBorderWidth: 6,
    circleBorderColor: '#ffffff',
  },
  argTypes: {
    step: { control: { type: 'number', min: 1, max: 10 }, description: 'Número do passo' },
    title: { control: 'text', description: 'Título do passo' },
    description: { control: 'text', description: 'Descrição do passo' },
    accentColor: { control: 'color', description: 'Cor do círculo' },
    backgroundColor: { control: 'color', description: 'Cor de fundo do cartão' },
    circleSize: { control: { type: 'number', min: 48, max: 160 }, description: 'Diâmetro do círculo (px)' },
    circleBorderWidth: { control: { type: 'number', min: 0, max: 12 }, description: 'Espessura do aro branco (px)' },
    circleBorderColor: { control: 'color', description: 'Cor do aro' },
  },
};
export default meta;

type Story = StoryObj<typeof InfoStepCard>;

export const Default: Story = {};

export const PassoDois: Story = {
  args: {
    step: 2,
    title: 'Perfil das Crianças',
    description:
      'Mostra-nos os leitores! Indica o nome, a idade e o perfil de cada criança para receber sugestões perfeitas.',
  },
};

export const CoresCustom: Story = {
  args: {
    accentColor: '#FF5722',
    backgroundColor: 'rgba(255,87,34,0.08)',
    circleBorderColor: '#FFEBEE',
  },
};
