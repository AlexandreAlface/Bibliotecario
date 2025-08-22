import { ViewStyle } from "react-native";
import type { MD3Elevation } from "react-native-paper/lib/typescript/types";
/**
 * Barra de tabs baseada em ícones com duas variantes:
 * - "ig"  : estilo Instagram (sem pill, bounce no press, linha superior)
 * - "pill": estilo iOS com pill por trás do item ativo
 */
export type IconTabItem<TKey extends string = string> = {
    key: TKey;
    icon: string;
    accessibilityLabel?: string;
    badgeCount?: number;
    disabled?: boolean;
    onLongPress?: () => void;
};
export type IconTabBarProps<TKey extends string = string> = {
    items: IconTabItem<TKey>[];
    activeKey: TKey;
    onChange: (key: TKey) => void;
    variant?: "ig" | "pill";
    backgroundColor?: string;
    activePillColor?: string;
    activeIconColor?: string;
    inactiveIconColor?: string;
    iconSize?: number;
    pillSize?: number;
    elevation?: MD3Elevation;
    showTopBorder?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
};
export declare function IconTabBar<TKey extends string = string>({ items, activeKey, onChange, variant, backgroundColor, activePillColor, activeIconColor, inactiveIconColor, iconSize, pillSize, elevation, showTopBorder, style, accessibilityLabel, }: IconTabBarProps<TKey>): import("react/jsx-runtime").JSX.Element;
export default IconTabBar;
