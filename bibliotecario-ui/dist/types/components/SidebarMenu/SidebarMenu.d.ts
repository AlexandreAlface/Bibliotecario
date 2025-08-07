import React from 'react';
import { SxProps, Theme } from '@mui/material';
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
    sx?: SxProps<Theme>;
}
export declare const SidebarMenu: React.FC<SidebarMenuProps>;
