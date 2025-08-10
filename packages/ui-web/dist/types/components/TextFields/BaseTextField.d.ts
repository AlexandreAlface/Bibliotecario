import { type TextFieldProps } from '@mui/material';
export interface BaseProps {
    radius?: number;
    px?: number;
    py?: number;
}
export declare const BaseTextField: import("@emotion/styled").StyledComponent<{
    variant?: import("@mui/material").TextFieldVariants | undefined;
} & Omit<import("@mui/material").OutlinedTextFieldProps | import("@mui/material").FilledTextFieldProps | import("@mui/material").StandardTextFieldProps, "variant"> & (import("@mui/system").MUIStyledCommonProps<import("@mui/system").Theme> & (TextFieldProps & BaseProps)), {}, {}>;
