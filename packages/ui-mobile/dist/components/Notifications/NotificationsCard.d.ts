import * as React from "react";
import { ViewStyle } from "react-native";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";
export type NotificationItem = {
    id: string;
    title: string;
    subtitle?: string;
    read?: boolean;
    leftIcon?: string;
    accessibilityLabel?: string;
};
export type NotificationsCardProps = {
    items: NotificationItem[];
    headerTitle?: string;
    onItemPress?: (item: NotificationItem) => void;
    onItemDelete?: (item: NotificationItem) => void;
    onClearAll?: () => void;
    loading?: boolean;
    emptyText?: string;
    maxHeight?: number;
    elevation?: MD3Elevation;
    style?: ViewStyle;
    /** Ativa gesto de arrastar para apagar (direita->esquerda) */
    swipeToDelete?: boolean;
};
declare const NotificationsCard: React.FC<NotificationsCardProps>;
export default NotificationsCard;
