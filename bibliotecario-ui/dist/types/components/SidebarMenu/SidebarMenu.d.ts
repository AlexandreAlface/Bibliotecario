import React from 'react';
import { SxProps, Theme } from '@mui/material';
import { VerticalPos } from './SidebarToggle';
export interface MenuItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    selected?: boolean;
    disabled?: boolean;
}
export interface SidebarMenuProps {
    items: MenuItem[];
    footerItems?: MenuItem[];
    open?: boolean;
    onToggle?: (open: boolean) => void;
    toggleVertical?: VerticalPos;
    sx?: SxProps<Theme>;
}
export declare const SidebarMenu: React.FC<SidebarMenuProps>;
