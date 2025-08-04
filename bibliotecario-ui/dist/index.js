import { jsx, jsxs } from 'react/jsx-runtime';
import { styled, Button, alpha, ThemeProvider, CssBaseline, TextField, InputAdornment, IconButton, Divider, Typography, Link, Card } from '@mui/material';
import { shouldForwardProp, styled as styled$1 } from '@mui/system';
import { createTheme } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import { useState, forwardRef } from 'react';
import { VisibilityOff, Visibility } from '@mui/icons-material';

const Styled$1 = styled(Button, {
    // Impede que props customizadas vão parar ao DOM
    shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== 'radius' && prop !== 'px',
})(({ theme, radius = 4, px = 3 }) => ({
    borderRadius: theme.spacing(radius),
    paddingInline: theme.spacing(px),
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: 'none',
    lineHeight: 1.5,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.9),
        boxShadow: 'none',
    },
    '&:disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
    },
    '&.Mui-focusVisible': {
        outline: `2px solid ${alpha(theme.palette.primary.light, 0.8)}`,
        outlineOffset: 2,
    },
}));
function PrimaryButton(props) {
    return (jsx(Styled$1, { variant: "contained", color: "primary", disableElevation: true, ...props }));
}

const Styled = styled(Button, {
    shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== 'radius' && prop !== 'px',
})(({ theme, radius = 4, px = 3 }) => ({
    borderRadius: theme.spacing(radius),
    paddingInline: theme.spacing(px),
    textTransform: 'none',
    fontWeight: 500,
    backgroundColor: theme.palette.common.white,
    color: theme.palette.primary.main,
    border: `2px solid ${theme.palette.primary.main}`,
    '&:hover': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.common.white,
        borderColor: theme.palette.primary.main,
    },
    '&:disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
        borderColor: theme.palette.action.disabledBackground,
    },
}));
function SecondaryButton(props) {
    return jsx(Styled, { variant: "outlined", ...props });
}

/* Paleta baseada nas tuas cores */
const palette = {
    primary: { main: '#8DC63F', contrastText: '#ffffff' }, // verde
    secondary: { main: '#7D3F98', contrastText: '#ffffff' }, // roxo
    background: {
        default: '#fafafa',
        paper: '#ffffff',
    },
};
const theme = createTheme({
    palette,
    typography: {
        fontFamily: 'Poppins, Arial, sans-serif',
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 600,
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 16 },
    components: {
        /* exemplo de override global */
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 32, paddingInline: 24 },
            },
            defaultProps: {
                disableElevation: true,
            },
        },
    },
});

function BibliotecarioThemeProvider({ children }) {
    return (jsxs(ThemeProvider, { theme: theme, children: [jsx(CssBaseline, {}), children] }));
}

// src/components/TextField/BaseTextField.tsx
const BaseTextField = styled$1(TextField, {
    shouldForwardProp: (prop) => shouldForwardProp(prop) &&
        !['radius', 'px', 'py'].includes(prop),
})(({ theme, radius = 3, px = 2, py = 1.5 }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: theme.spacing(radius),
        '& fieldset': { borderColor: theme.palette.grey[400] },
        '&:hover fieldset': { borderColor: theme.palette.primary.main },
        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputBase-input': {
        padding: theme.spacing(py, px),
    },
}));

function EmailField(props) {
    return (jsx(BaseTextField, { type: "email", label: "E-mail ou telem\u00F3vel", autoComplete: "email", ...props }));
}

function NumericField(props) {
    return (jsx(BaseTextField, { label: "N\u00FAmero de telem\u00F3vel", type: "tel", inputProps: { inputMode: 'numeric', pattern: '[0-9]*' }, ...props }));
}

function PasswordField(props) {
    const [show, setShow] = useState(false);
    return (jsx(BaseTextField, { type: show ? 'text' : 'password', label: "Palavra-passe", autoComplete: "current-password", InputProps: {
            endAdornment: (jsxs(InputAdornment, { position: "end", children: [jsx(IconButton, { onClick: () => setShow((v) => !v), edge: "end", "aria-label": show ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe', size: "small", children: show ? jsx(VisibilityOff, {}) : jsx(Visibility, {}) }), jsx("span", { style: { marginLeft: 4, fontSize: 14 }, children: show ? 'Ocultar' : 'Mostrar' })] })),
        }, ...props }));
}

function SectionDivider({ label, width = '100%', thickness = 1, spacingY = 3, sx, }) {
    return (jsx(Divider, { textAlign: "center", sx: {
            width,
            my: spacingY,
            borderBottomWidth: thickness,
            ...sx,
        }, children: jsx(Typography, { variant: "body2", color: "text.secondary", fontWeight: 500, sx: { px: 1 }, children: label }) }));
}

const StyledLink = styled(Link, {
    shouldForwardProp: (prop) => prop !== 'underlineThickness' && prop !== 'weight',
})(({ theme, underlineThickness = 1, weight = 500 }) => ({
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
const RouteLink = forwardRef(function RouteLink(props, ref) {
    return jsx(StyledLink, { ref: ref, ...props });
});

const StyledCard = styled(Card, {
    shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== 'width' && prop !== 'height',
})(({ theme, width, height }) => ({
    borderRadius: theme.spacing(3), /* 24 px se spacing = 8 */
    padding: theme.spacing(4), /* 32 px */
    backgroundColor: theme.palette.common.white,
    boxShadow: `0 4px 12px ${theme.palette.grey[300]}`,
    width,
    height,
}));
function WhiteCard(props) {
    return jsx(StyledCard, { variant: "outlined", ...props });
}

export { BibliotecarioThemeProvider, EmailField, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, WhiteCard, theme };
//# sourceMappingURL=index.js.map
