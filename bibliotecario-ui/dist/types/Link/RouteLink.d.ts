import { LinkProps } from '@mui/material';
export interface RouteLinkProps extends LinkProps {
    /** Raio do sublinhado (espessura em px) – default 1 */
    underlineThickness?: number;
    /** Peso do texto – default 500 */
    weight?: number;
}
/**
 * RouteLink – link estilizado com sublinhado custom.
 * Usa <a> por defeito mas aceita component={RouterLink} se precisares de routing.
 */
export declare const RouteLink: import("react").ForwardRefExoticComponent<Omit<RouteLinkProps, "ref"> & import("react").RefAttributes<HTMLAnchorElement>>;
