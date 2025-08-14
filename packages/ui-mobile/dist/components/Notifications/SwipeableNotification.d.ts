import * as React from "react";
export type NotificationItem = {
    id: string;
    title: string;
    subtitle?: string;
};
type Props = {
    item: NotificationItem;
    onDelete: (id: string) => void;
};
declare const SwipeableNotification: React.FC<Props>;
export default SwipeableNotification;
