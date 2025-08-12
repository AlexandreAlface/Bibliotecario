import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React$1 from 'react';
import React__default, { PropsWithChildren, ReactElement } from 'react';
import * as _mui_material_styles from '@mui/material/styles';
import * as _mui_material from '@mui/material';
import { ButtonProps, TextFieldProps as TextFieldProps$1, SxProps, Theme, LinkProps, CardProps, BoxProps, Card, IconButtonProps } from '@mui/material';
import { TextFieldProps } from '@mui/material/TextField';
import * as _emotion_styled from '@emotion/styled';
import * as _mui_system from '@mui/system';

/**
 * BibliotecarioThemeProvider is a custom theme provider that applies the MUI theme
 * and CssBaseline to the application.
 *
 * @param {PropsWithChildren} props - The props containing children components.
 * @returns {JSX.Element} The ThemeProvider with the applied theme and CssBaseline.
 */
declare function BibliotecarioThemeProvider({ children }: PropsWithChildren): react_jsx_runtime.JSX.Element;

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

type Props$1 = Omit<TextFieldProps, 'type' | 'variant'> & {
    inputRef?: React.Ref<HTMLInputElement>;
};
declare const EmailField: React$1.ForwardRefExoticComponent<Omit<Props$1, "ref"> & React$1.RefAttributes<HTMLInputElement>>;

interface BaseProps {
    radius?: number;
    px?: number;
    py?: number;
}
declare const BaseTextField: _emotion_styled.StyledComponent<{
    variant?: _mui_material.TextFieldVariants | undefined;
} & Omit<_mui_material.OutlinedTextFieldProps | _mui_material.FilledTextFieldProps | _mui_material.StandardTextFieldProps, "variant"> & (_mui_system.MUIStyledCommonProps<_mui_system.Theme> & (TextFieldProps$1 & BaseProps)), {}, {}>;

declare function NumericField(props: TextFieldProps$1 & BaseProps): react_jsx_runtime.JSX.Element;

type Props = Omit<TextFieldProps, 'type' | 'variant'> & {
    inputRef?: React.Ref<HTMLInputElement>;
};
declare const PasswordField: React$1.ForwardRefExoticComponent<Omit<Props, "ref"> & React$1.RefAttributes<HTMLInputElement>>;

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
declare const RouteLink: React$1.ForwardRefExoticComponent<Omit<RouteLinkProps, "ref"> & React$1.RefAttributes<HTMLAnchorElement>>;

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
declare const GradientBackground: _emotion_styled.StyledComponent<_mui_system.BoxOwnProps<_mui_material.Theme> & Omit<Omit<React$1.DetailedHTMLProps<React$1.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & {
    ref?: ((instance: HTMLDivElement | null) => void | React$1.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React$1.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React$1.RefObject<HTMLDivElement> | null | undefined;
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

interface LogoProps extends BoxProps {
    width?: string | number;
    height?: string | number;
}
declare const Logo: React__default.FC<LogoProps>;

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

type VerticalPos = 'top' | 'center' | 'bottom' | number;

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
    toggleVertical?: VerticalPos;
    sx?: SxProps<Theme>;
}
declare const SidebarMenu: React__default.FC<SidebarMenuProps>;

interface NotificationItem {
    id: string;
    titulo: string;
    mensagem?: string;
    lida?: boolean;
    data?: Date;
}
interface NotificationBellProps extends Omit<IconButtonProps, 'onSelect'> {
    /** Lista actual de notificações (ordenada como quiseres) */
    items: NotificationItem[];
    /** Clicar numa notificação */
    onSelect?: (item: NotificationItem) => void;
    /** Remover (apenas) uma notificação */
    onRemove?: (id: string) => void;
    /** Marcar todas como lidas / limpar contador  */
    onClearAll?: () => void;
    /** Mostrar badge mesmo quando 0 (ex.: cor cinza) */
    showZero?: boolean;
}
declare const NotificationBell: React__default.FC<NotificationBellProps>;

interface ChildOption {
    id: string;
    nome: string;
    avatar?: string;
}
interface AvatarSelectProps {
    label: string;
    options: ChildOption[];
    value: string | '';
    onChange: (id: string) => void;
    disabled?: boolean;
    /** ReactNode para o avatar de placeholder (default ícone pessoa) */
    placeholderAvatar?: React__default.ReactNode;
    /** Largura mínima, útil em <Stack spacing> */
    minWidth?: number | string;
}
declare const AvatarSelect: React__default.FC<AvatarSelectProps>;

interface QuizProgressBarProps {
    /** Passo actual (1-based) */
    passo: number;
    /** Número total de passos/perguntas */
    total: number;
    /** Mostrar percentagem por cima?  */
    mostrarTexto?: boolean;
}
/**
 * Barra de progresso animada para o Quiz.
 */
declare const QuizProgressBar: React__default.FC<QuizProgressBarProps>;

interface DataColumn<Row = any> {
    label: string;
    field?: keyof Row;
    render?: (row: Row) => React__default.ReactNode;
    width?: number | string;
    align?: 'left' | 'center' | 'right';
    filterable?: boolean;
    sx?: SxProps<Theme>;
}
interface SimpleDataTableProps<Row = any> {
    columns: DataColumn<Row>[];
    rows: Row[];
    rowsPerPageOptions?: number[];
    sx?: SxProps<Theme>;
}
declare function SimpleDataTable<Row>({ columns, rows, rowsPerPageOptions, sx, }: SimpleDataTableProps<Row>): react_jsx_runtime.JSX.Element;

type BookCardVariant = 'view' | 'edit' | 'reserve';
interface BookCardProps {
    variant?: BookCardVariant;
    title: string;
    coverImage: string;
    startDate?: string;
    endDate?: string;
    rating?: number;
    comment?: string;
    onSave?: (rating: number, comment: string, coverImage: string) => void;
    onReserve?: () => void;
}
declare const BookCard: React__default.FC<BookCardProps>;

interface AgendaItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    categories: string[];
    thumbnailUrl?: string;
    [key: string]: any;
}

interface AgendaFeedProps {
    feedUrl: string;
    columns?: number;
    imageRatio?: string;
    contentPadding?: number;
    cardMaxWidth?: string | number;
    actions?: (item: AgendaItem) => React__default.ReactNode;
}
declare const AgendaFeed: React__default.FC<AgendaFeedProps>;

interface AgendaLargeCardProps extends AgendaItem {
    /** largura do cartão (ex: '100%', '600px') */
    width?: string | number;
    /** proporção da área de imagem (ex: '16/9') */
    imageRatio?: string;
    /** número de caracteres antes de truncar */
    truncateLength?: number;
}
declare const AgendaLargeCard: React__default.FC<AgendaLargeCardProps>;

interface FilterOption {
    value: string;
    label: string;
}
interface FilterDefinition {
    id: string;
    label: string;
    options: FilterOption[];
}
interface FilterBarProps {
    filters: FilterDefinition[];
    selected: Record<string, string[]>;
    onChange: (filterId: string, values: string[]) => void;
    icons?: Record<string, ReactElement>;
    chipIcons?: Record<string, ReactElement>;
}
declare const FilterBar: React__default.FC<FilterBarProps>;

export { type Action, AgendaFeed, type AgendaFeedProps, AgendaLargeCard, type AgendaLargeCardProps, AvatarListItem, type AvatarListItemProps, AvatarSelect, type AvatarSelectProps, AvatarUpload, type AvatarUploadProps, BaseTextField, BibliotecarioThemeProvider, BookCard, type BookCardProps, type BookCardVariant, type ChildOption, type DataColumn, EmailField, FilterBar, type FilterBarProps, type FilterDefinition, type FilterOption, GradientBackground, HowItWorksSection, InfoStepCard, Logo, type LogoProps, type MenuItem, NotificationBell, type NotificationBellProps, type NotificationItem, NumericField, type Option, PasswordField, PrimaryButton, QuizProgressBar, type QuizProgressBarProps, RouteLink, SecondaryButton, SectionDivider, SelectableOptions, type SelectableOptionsProps, SidebarMenu, type SidebarMenuProps, SimpleDataTable, type SimpleDataTableProps, WhiteCard, theme };
