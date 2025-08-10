interface Props<T = any> {
    open: boolean;
    anchorEl: HTMLElement | null;
    values: T[];
    selected: Set<T>;
    onClose: () => void;
    onApply: (set: Set<T>) => void;
}
export declare function ColumnFilterPopper<T>({ open, anchorEl, values, selected, onClose, onApply, }: Props<T>): import("react/jsx-runtime").JSX.Element;
export {};
