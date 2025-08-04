import * as react_jsx_runtime from 'react/jsx-runtime';
import { ButtonProps, TextFieldProps, SxProps, Theme, LinkProps, CardProps } from '@mui/material';
import * as _mui_material_styles from '@mui/material/styles';
import * as react from 'react';

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

export { BibliotecarioThemeProvider, EmailField, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, WhiteCard, theme };
