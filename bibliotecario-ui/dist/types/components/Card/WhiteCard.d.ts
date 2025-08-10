import { CardProps } from '@mui/material';
interface WhiteCardProps extends CardProps {
    /** Largura (px, %, rem…). Se omitido usa auto/max-content */
    width?: string | number;
    /** Altura (px, %, vh…). Opcional */
    height?: string | number;
}
export declare function WhiteCard(props: WhiteCardProps): import("react/jsx-runtime").JSX.Element;
export {};
