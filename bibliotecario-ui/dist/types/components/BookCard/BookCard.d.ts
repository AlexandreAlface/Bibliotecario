import React from 'react';
export type BookCardVariant = 'view' | 'edit' | 'reserve';
export interface BookCardProps {
    variant?: BookCardVariant;
    title: string;
    coverImage: string;
    startDate?: string;
    endDate?: string;
    rating?: number;
    comment?: string;
    onSave?: (rating: number, comment: string, coverImage: string) => void;
    onReserve?: () => void;
}
export declare const BookCard: React.FC<BookCardProps>;
