import { type BoxProps } from '@mui/material';
interface GradientProps extends BoxProps {
    /** cor inicial (qualquer CSS color) – default theme.palette.secondary.main (verde) */
    from?: string;
    /** cor final – default theme.palette.primary.main (roxo) */
    to?: string;
    /** ângulo do gradiente em deg – default 135 */
    angle?: number;
}
export declare const GradientBackground: import("@emotion/styled").StyledComponent<import("@mui/system").BoxOwnProps<import("@mui/material").Theme> & Omit<Omit<import("react").DetailedHTMLProps<import("react").HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
    ref?: ((instance: HTMLDivElement | null) => void | import("react").DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof import("react").DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | import("react").RefObject<HTMLDivElement> | null | undefined;
}, keyof import("@mui/system").BoxOwnProps<import("@mui/material").Theme>> & import("@mui/system").MUIStyledCommonProps<import("@mui/material").Theme> & GradientProps, {}, {}>;
export {};
