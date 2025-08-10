import { Link, LinkProps, styled } from '@mui/material';
import { forwardRef } from 'react';

export interface RouteLinkProps extends LinkProps {
  /** Raio do sublinhado (espessura em px) – default 1 */
  underlineThickness?: number;
  /** Peso do texto – default 500 */
  weight?: number;
}

const StyledLink = styled(Link, {
  shouldForwardProp: (prop) =>
    prop !== 'underlineThickness' && prop !== 'weight',
})<RouteLinkProps>(({ theme, underlineThickness = 1, weight = 500 }) => ({
  ...theme.typography.body2,
  fontWeight: weight,
  color: theme.palette.text.primary,
  textDecoration: 'none',
  position: 'relative',
  display: 'inline-block',

  '&::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: underlineThickness,
    backgroundColor: 'currentColor',
    transition: 'opacity .2s',
    opacity: 1,
  },

  '&:hover::after': { opacity: 0.6 },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.light}`,
    outlineOffset: 2,
  },
}));

/**
 * RouteLink – link estilizado com sublinhado custom.
 * Usa <a> por defeito mas aceita component={RouterLink} se precisares de routing.
 */
export const RouteLink = forwardRef<HTMLAnchorElement, RouteLinkProps>(
  function RouteLink(props, ref) {
    return <StyledLink ref={ref} {...props} />;
  },
);
