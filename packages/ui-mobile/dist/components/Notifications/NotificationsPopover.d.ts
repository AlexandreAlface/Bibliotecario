import * as React from "react";
import { ViewStyle } from "react-native";
import { NotificationBellProps } from "./NotificationBell";
import { NotificationItem, NotificationsCardProps } from "./NotificationsCard";
type PopoverPlacement = "auto" | "left" | "right";
export type NotificationsPopoverProps = {
    items: NotificationItem[];
    count?: number;
    onItemPress?: NotificationsCardProps["onItemPress"];
    onItemDelete?: NotificationsCardProps["onItemDelete"];
    onClearAll?: NotificationsCardProps["onClearAll"];
    width?: number;
    screenMargin?: number;
    anchorGap?: number;
    placement?: PopoverPlacement;
    bellProps?: Omit<NotificationBellProps, "count" | "onPress">;
    style?: ViewStyle;
    /** Ativa swipe para apagar dentro do cartão */
    swipeToDelete?: boolean;
};
declare const NotificationsPopover: React.FC<NotificationsPopoverProps>;
export default NotificationsPopover;
