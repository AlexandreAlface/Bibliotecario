import * as React from "react";
import { ViewStyle } from "react-native";
export type NotificationBellProps = {
    /** Número de notificações não lidas. */
    count?: number;
    /** Se true, mostra o badge mesmo quando count = 0 (com “0”). Default: false */
    showZero?: boolean;
    /** Limite visual do badge (ex.: 99+). Default: 99 */
    maxCount?: number;
    /** Ícone do sino (MaterialCommunity). Default: 'bell-outline' */
    icon?: string;
    /** Tamanho do ícone. Default: 24 */
    size?: number;
    /** Cor do badge. Default: theme.colors.error */
    badgeColor?: string;
    /** Cor do texto do badge. Default: theme.colors.onError */
    badgeTextColor?: string;
    /** Callback ao pressionar. */
    onPress?: () => void;
    /** Desativa interações. */
    disabled?: boolean;
    /** Estilo extra do wrapper. */
    style?: ViewStyle;
    /** A11y label personalizado. */
    accessibilityLabel?: string;
};
declare const NotificationBell: React.FC<NotificationBellProps>;
export default NotificationBell;
