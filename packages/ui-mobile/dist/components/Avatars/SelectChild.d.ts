import React from "react";
import { MenuProps } from "react-native-paper";
export type ChildOption = {
    id: string;
    name: string;
    avatarUri?: string;
};
export interface SelectChildProps {
    label?: string;
    placeholder?: string;
    value?: string;
    options: ChildOption[];
    onChange: (id: string) => void;
    disabled?: boolean;
    menuMaxHeight?: number;
    anchorTestID?: string;
    accessibilityLabel?: string;
    /** Ajusta o posicionamento relativo ao anchor */
    anchorPosition?: MenuProps["anchorPosition"];
}
declare const SelectChild: React.FC<SelectChildProps>;
export default SelectChild;
export type { SelectChildProps as ISelectChildProps };
