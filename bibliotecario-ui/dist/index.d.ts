import * as react_jsx_runtime from 'react/jsx-runtime';
import * as _mui_material from '@mui/material';
import { ButtonProps, TextFieldProps, SxProps, Theme, LinkProps, CardProps, BoxProps, Card } from '@mui/material';
import * as _mui_material_styles from '@mui/material/styles';
import * as React from 'react';
import React__default, { PropsWithChildren } from 'react';
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

/**
 * BibliotecarioThemeProvider is a custom theme provider that applies the MUI theme
 * and CssBaseline to the application.
 *
 * @param {PropsWithChildren} props - The props containing children components.
 * @returns {JSX.Element} The ThemeProvider with the applied theme and CssBaseline.
 */
declare function BibliotecarioThemeProvider({ children }: PropsWithChildren): react_jsx_runtime.JSX.Element;

interface BaseProps {
    radius?: number;
    px?: number;
    py?: number;
}
declare const BaseTextField: _emotion_styled.StyledComponent<{
    variant?: _mui_material.TextFieldVariants | undefined;
} & Omit<_mui_material.FilledTextFieldProps | _mui_material.OutlinedTextFieldProps | _mui_material.StandardTextFieldProps, "variant"> & (_mui_system.MUIStyledCommonProps<_mui_system.Theme> & (TextFieldProps & BaseProps)), {}, {}>;

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
declare const RouteLink: React.ForwardRefExoticComponent<Omit<RouteLinkProps, "ref"> & React.RefAttributes<HTMLAnchorElement>>;

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
declare const GradientBackground: _emotion_styled.StyledComponent<_mui_system.BoxOwnProps<_mui_material.Theme> & Omit<Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
    ref?: ((instance: HTMLDivElement | null) => void | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React.RefObject<HTMLDivElement> | null | undefined;
}, keyof _mui_system.BoxOwnProps<_mui_material.Theme>> & _mui_system.MUIStyledCommonProps<_mui_material.Theme> & GradientProps, {}, {}>;

interface InfoStepCardProps {
    step: number | string;
    title: string;
    description: string;
    accentColor?: string;
    backgroundColor?: string;
    /** Diâmetro do círculo (px) – default 88 px */
    circleSize?: number;
    /** Largura do aro branco (px) – default 6 px */
    circleBorderWidth?: number;
    /** Cor do aro – default #fff */
    circleBorderColor?: string;
    cardProps?: React__default.ComponentProps<typeof Card>;
}
declare const InfoStepCard: React__default.FC<InfoStepCardProps>;

interface HowItWorksSectionProps {
    /**
     * Lista de passos a apresentar.
     * Cada item é simplesmente o conjunto de props de <InfoStepCard />.
     */
    steps: InfoStepCardProps[];
    /**
     * Direcção dos cartões.
     * - 'vertical' (por defeito) = empilhados
     * - 'horizontal' = lado-a-lado
     */
    orientation?: 'vertical' | 'horizontal';
    /**
     * Espaço entre cartões em unidades de theme.spacing (default 6 = 48 px)
     */
    spacing?: number;
    /**
     * Sx extra para o <Stack />
     */
    sx?: object;
}
declare const HowItWorksSection: React__default.FC<HowItWorksSectionProps>;

declare const Logo: React__default.FC;

type Option = {
    value: string | number;
    label: React__default.ReactNode;
};
interface SelectableOptionsProps {
    /** Título/legenda do grupo (opcional) */
    label?: string;
    /** Lista de opções */
    options: Option[];
    /** Valor(es) selecionado(s) */
    value: string | number | (string | number)[];
    /** Callback de alteração */
    onChange: (value: string | number | (string | number)[]) => void;
    /** Tipo de controlo */
    variant?: 'checkbox' | 'radio';
    /** Disposição horizontal ou vertical */
    row?: boolean;
    /** Estilos adicionais */
    sx?: SxProps<Theme>;
}
declare const SelectableOptions: React__default.FC<SelectableOptionsProps>;

interface AvatarUploadProps {
    /** URL/Blob da imagem (controlado) */
    value?: string;
    /** Callback devolve o ficheiro e o URL criado */
    onChange?: (file: File | null, url: string | null) => void;
    /** Diâmetro do avatar (px) */
    size?: number;
    /** Placeholder (ex.: iniciais) se não houver imagem */
    placeholder?: React__default.ReactNode;
    /** Mostrar ou esconder o botão-ícone */
    showIcon?: boolean;
    /** Estilos extra */
    sx?: SxProps<Theme>;
}
declare const AvatarUpload: React__default.FC<AvatarUploadProps>;

interface Action {
    /** Ícone a renderizar dentro do IconButton */
    icon: React__default.ReactNode;
    /** Tooltip opcional */
    tooltip?: string;
    /** Callback */
    onClick?: () => void;
    /** Desabilitar botão? */
    disabled?: boolean;
}
interface AvatarListItemProps {
    avatarSrc?: string;
    /** Texto principal (ex.: "Camila, 7 anos") */
    label: React__default.ReactNode;
    /** Lista de acções à direita */
    actions?: Action[];
    /** Tamanho do avatar (px) */
    avatarSize?: number;
    /** Estilos extra */
    sx?: SxProps<Theme>;
}
declare const AvatarListItem: React__default.FC<AvatarListItemProps>;

interface MenuItem {
    label: string;
    icon: React__default.ReactNode;
    onClick?: () => void;
    selected?: boolean;
    disabled?: boolean;
}
interface SidebarMenuProps {
    items: MenuItem[];
    footerItems?: MenuItem[];
    open?: boolean;
    onToggle?: (open: boolean) => void;
    sx?: SxProps<Theme>;
}
declare const SidebarMenu: React__default.FC<SidebarMenuProps>;

export { AvatarListItem, AvatarUpload, BaseTextField, BibliotecarioThemeProvider, EmailField, GradientBackground, HowItWorksSection, InfoStepCard, Logo, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, SelectableOptions, SidebarMenu, WhiteCard, theme };
export type { Action, AvatarListItemProps, AvatarUploadProps, MenuItem, Option, SelectableOptionsProps, SidebarMenuProps };
