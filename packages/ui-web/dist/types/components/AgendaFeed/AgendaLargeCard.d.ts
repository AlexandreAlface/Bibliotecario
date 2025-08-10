import React from 'react';
import { AgendaItem } from '../../hooks/useAgendaFeed';
export interface AgendaLargeCardProps extends AgendaItem {
    /** largura do cartão (ex: '100%', '600px') */
    width?: string | number;
    /** proporção da área de imagem (ex: '16/9') */
    imageRatio?: string;
    /** número de caracteres antes de truncar */
    truncateLength?: number;
}
export declare const AgendaLargeCard: React.FC<AgendaLargeCardProps>;
