import * as React from "react";
import type { AccessibilityRole } from "react-native";
import { List, IconButton } from "react-native-paper";
export type AvatarAction = {
    icon: React.ComponentProps<typeof IconButton>["icon"];
    onPress: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
    testID?: string;
};
export interface AvatarItemProps extends Omit<React.ComponentProps<typeof List.Item>, "title" | "description" | "left" | "right"> {
    label: string;
    description?: string;
    avatarSrc?: string;
    avatarSize?: number;
    actions?: AvatarAction[];
    accessibilityRole?: AccessibilityRole;
}
export declare const AvatarItem: React.FC<AvatarItemProps>;
