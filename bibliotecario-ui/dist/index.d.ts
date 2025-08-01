import * as react_jsx_runtime from 'react/jsx-runtime';
import * as _mui_material from '@mui/material';
import { ButtonProps } from '@mui/material';
import * as _emotion_styled from '@emotion/styled';
import * as _mui_system from '@mui/system';
import * as react from 'react';
import * as _mui_material_OverridableComponent from '@mui/material/OverridableComponent';
import * as _mui_material_styles from '@mui/material/styles';

declare function PrimaryButton(props: ButtonProps): react_jsx_runtime.JSX.Element;

declare const SecondaryButton: _emotion_styled.StyledComponent<_mui_material.ButtonOwnProps & Omit<_mui_material.ButtonBaseOwnProps, "classes"> & _mui_material_OverridableComponent.CommonProps & Omit<Omit<react.DetailedHTMLProps<react.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref"> & {
    ref?: ((instance: HTMLButtonElement | null) => void | react.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof react.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | react.RefObject<HTMLButtonElement> | null | undefined;
}, "className" | "style" | "classes" | "action" | "centerRipple" | "children" | "disabled" | "disableRipple" | "disableTouchRipple" | "focusRipple" | "focusVisibleClassName" | "LinkComponent" | "onFocusVisible" | "sx" | "tabIndex" | "TouchRippleProps" | "touchRippleRef" | "href" | "color" | "disableElevation" | "disableFocusRipple" | "endIcon" | "fullWidth" | "loading" | "loadingIndicator" | "loadingPosition" | "size" | "startIcon" | "variant"> & _mui_system.MUIStyledCommonProps<_mui_material.Theme>, {}, {}>;

declare function BibliotecarioThemeProvider({ children }: {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

declare const theme: _mui_material_styles.Theme;

export { BibliotecarioThemeProvider, PrimaryButton, SecondaryButton, theme };
