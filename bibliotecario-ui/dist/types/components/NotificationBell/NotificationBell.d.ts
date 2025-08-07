import React from 'react';
import { IconButtonProps } from '@mui/material';
export interface NotificationItem {
    id: string;
    titulo: string;
    mensagem?: string;
    lida?: boolean;
    data?: Date;
}
export interface NotificationBellProps extends Omit<IconButtonProps, 'onSelect'> {
    /** Lista actual de notificações (ordenada como quiseres) */
    items: NotificationItem[];
    /** Clicar numa notificação */
    onSelect?: (item: NotificationItem) => void;
    /** Remover (apenas) uma notificação */
    onRemove?: (id: string) => void;
    /** Marcar todas como lidas / limpar contador  */
    onClearAll?: () => void;
    /** Mostrar badge mesmo quando 0 (ex.: cor cinza) */
    showZero?: boolean;
}
export declare const NotificationBell: React.FC<NotificationBellProps>;
