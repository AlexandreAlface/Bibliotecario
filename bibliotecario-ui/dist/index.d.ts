import * as react_jsx_runtime from 'react/jsx-runtime';
import * as _mui_material from '@mui/material';
import { ButtonProps, TextFieldProps, SxProps, Theme, LinkProps, CardProps, BoxProps } from '@mui/material';
import * as _mui_material_styles from '@mui/material/styles';
import * as react from 'react';
import * as _emotion_styled from '@emotion/styled';
import * as _mui_system from '@mui/system';

type SizeProps = {
    radius?: number;
    px?: number;
};
declare const theme: _mui_material_styles.Theme;

interface PrimaryProps extends ButtonProps, SizeProps {
}
declare function PrimaryButton(props: PrimaryProps): react_jsx_runtime.JSX.Element;

interface SecondaryProps extends ButtonProps, SizeProps {
}
declare function SecondaryButton(props: SecondaryProps): react_jsx_runtime.JSX.Element;

declare function BibliotecarioThemeProvider({ children }: {
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

interface BaseProps {
    radius?: number;
    px?: number;
    py?: number;
}

declare function EmailField(props: TextFieldProps & BaseProps): react_jsx_runtime.JSX.Element;

declare function NumericField(props: TextFieldProps & BaseProps): react_jsx_runtime.JSX.Element;

declare function PasswordField(props: TextFieldProps & BaseProps): react_jsx_runtime.JSX.Element;

interface SectionDividerProps {
    label: string;
    /** Largura total do divisor. Aceita %, px, rem…  – default '100%' */
    width?: string | number;
    /** Espessura da linha em px – default 1 */
    thickness?: number;
    /** Espaçamento vertical (theme.spacing) – default 3 */
    spacingY?: number;
    /** Qualquer extra do sx para override fino */
    sx?: SxProps<Theme>;
}
declare function SectionDivider({ label, width, thickness, spacingY, sx, }: SectionDividerProps): react_jsx_runtime.JSX.Element;

interface RouteLinkProps extends LinkProps {
    /** Raio do sublinhado (espessura em px) – default 1 */
    underlineThickness?: number;
    /** Peso do texto – default 500 */
    weight?: number;
}
/**
 * RouteLink – link estilizado com sublinhado custom.
 * Usa <a> por defeito mas aceita component={RouterLink} se precisares de routing.
 */
declare const RouteLink: react.ForwardRefExoticComponent<Omit<RouteLinkProps, "ref"> & react.RefAttributes<HTMLAnchorElement>>;

interface WhiteCardProps extends CardProps {
    /** Largura (px, %, rem…). Se omitido usa auto/max-content */
    width?: string | number;
    /** Altura (px, %, vh…). Opcional */
    height?: string | number;
}
declare function WhiteCard(props: WhiteCardProps): react_jsx_runtime.JSX.Element;

interface GradientProps extends BoxProps {
    /** cor inicial (qualquer CSS color) – default theme.palette.secondary.main (verde) */
    from?: string;
    /** cor final – default theme.palette.primary.main (roxo) */
    to?: string;
    /** ângulo do gradiente em deg – default 135 */
    angle?: number;
}
declare const GradientBackground: _emotion_styled.StyledComponent<_mui_system.BoxOwnProps<_mui_material.Theme> & Omit<Omit<react.DetailedHTMLProps<react.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
    ref?: ((instance: HTMLDivElement | null) => void | react.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof react.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | react.RefObject<HTMLDivElement> | null | undefined;
}, keyof _mui_system.BoxOwnProps<_mui_material.Theme>> & _mui_system.MUIStyledCommonProps<_mui_material.Theme> & GradientProps, {}, {}>;

export { BibliotecarioThemeProvider, EmailField, GradientBackground, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, WhiteCard, theme };
