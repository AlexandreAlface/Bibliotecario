import React from 'react';
import { AgendaItem } from '../../hooks/useAgendaFeed';
export interface AgendaFeedProps {
    feedUrl: string;
    columns?: number;
    imageRatio?: string;
    contentPadding?: number;
    cardMaxWidth?: string | number;
    actions?: (item: AgendaItem) => React.ReactNode;
}
export declare const AgendaFeed: React.FC<AgendaFeedProps>;
