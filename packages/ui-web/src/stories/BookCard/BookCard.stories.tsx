// src/components/BookCard/BookCard.stories.tsx
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BookCard, BookCardProps } from '../../components/BookCard';

const meta: Meta<BookCardProps> = {
  title: 'Components/BookCard',
  component: BookCard,
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['view', 'edit', 'reserve'] as const,
    },
    title: { control: 'text' },
    coverImage: { control: 'text' },
    startDate: { control: 'text' },
    endDate: { control: 'text' },
    rating: { control: { type: 'number', min: 0, max: 5, step: 0.5 } },
    comment: { control: 'text' },
    onSave: { action: 'saved' },
    onReserve: { action: 'reserved' },
  },
};

export default meta;
type Story = StoryObj<BookCardProps>;

export const View: Story = {
  args: {
    variant: 'view',
    title: 'Livro Exemplo',
    coverImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKSjOT5IGkqNAk4kuC7kgmDZw3amJrVwXloA&s',
    startDate: '01/07/2025',
    endDate: '10/07/2025',
    rating: 4,
    comment: 'Adorei as ilustrações!',
  },
};

export const Edit: Story = {
  args: {
    variant: 'edit',
    title: 'Harry Potter and the Deathly Hallows',
    coverImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKSjOT5IGkqNAk4kuC7kgmDZw3amJrVwXloA&s",
    rating: 0,
    comment: '',
  },
};

export const Reserve: Story = {
  args: {
    variant: 'reserve',
    title: 'Harry Potter and the Deathly Hallows',
    coverImage: "https://static.wikia.nocookie.net/harrypotter/images/7/7a/Harry_Potter_and_the_Philosopher%27s_Stone_%E2%80%93_Bloomsbury_2014_Children%27s_Edition_%28Paperback_and_Hardcover%29.jpg/revision/latest?cb=20170109041611",
    rating: 3.5,
  },
};
