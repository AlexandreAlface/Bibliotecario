// src/components/AgendaFeed/AgendaLargeCard.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgendaLargeCard, AgendaLargeCardProps } from '../../components/AgendaFeed';

const sampleDescription = `
  <p>Num concerto profundamente emocionante, Mafalda Vasques
  transporta-nos pela tradição do fado e do canto alentejano.</p>
  <p>Entrada gratuita. Público de todas as idades é bem-vindo!</p>
`;

const meta: Meta<AgendaLargeCardProps> = {
  title: 'Organisms/AgendaLargeCard',
  component: AgendaLargeCard,
  argTypes: {
    width:          { control: 'text' },
    imageRatio:     { control: 'text' },
    truncateLength: { control: { type: 'number', min: 50, max: 500, step: 10 } },
  },
};
export default meta;
type Story = StoryObj<AgendaLargeCardProps>;

export const Default: Story = {
  args: {
    title:          'Mafalda Vasques – Raízes que Cantam',
    pubDate:        '2025-07-02T20:30:00',
    description:    sampleDescription,
    thumbnailUrl:   'https://cm-beja.pt/upload_files/client_id_1/website_id_1/Agenda/2025/Centro%20UNESCO/noites_cmb_mafalda-01.jpg',
    link:           'https://cm-beja.pt/agenda/detalhes/1',
    width:          '600px',
    imageRatio:     '16/9',
    truncateLength: 200,
  },
};

export const Narrow: Story = {
  args: {
    ...Default.args,
    width: '400px',
  },
};

export const ShortPreview: Story = {
  args: {
    ...Default.args,
    truncateLength: 80,
  },
};
