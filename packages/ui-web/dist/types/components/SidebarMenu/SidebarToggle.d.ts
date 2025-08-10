import React from 'react';
export type VerticalPos = 'top' | 'center' | 'bottom' | number;
interface Props {
    open: boolean;
    openWidth: number;
    closedWidth: number;
    onToggle: () => void;
    vertical?: VerticalPos;
}
export declare const SidebarToggle: React.FC<Props>;
export {};
