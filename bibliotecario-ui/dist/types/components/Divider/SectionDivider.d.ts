import { SxProps, Theme } from '@mui/material';
export interface SectionDividerProps {
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
export declare function SectionDivider({ label, width, thickness, spacingY, sx, }: SectionDividerProps): import("react/jsx-runtime").JSX.Element;
