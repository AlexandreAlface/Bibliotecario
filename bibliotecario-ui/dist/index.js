import { jsx, jsxs } from 'react/jsx-runtime';
import { styled, Button, alpha, ThemeProvider, CssBaseline, TextField, InputAdornment, IconButton, Divider, Typography, Link, Card, Box, Stack } from '@mui/material';
import { shouldForwardProp, styled as styled$1 } from '@mui/system';
import { createTheme, styled as styled$2 } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
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

/**
 * BibliotecarioThemeProvider is a custom theme provider that applies the MUI theme
 * and CssBaseline to the application.
 *
 * @param {PropsWithChildren} props - The props containing children components.
 * @returns {JSX.Element} The ThemeProvider with the applied theme and CssBaseline.
 */
function BibliotecarioThemeProvider({ children }) {
    return (jsxs(ThemeProvider, { theme: theme, children: [jsx(CssBaseline, {}), children] }));
}

const BaseTextField = styled$1(TextField, {
    shouldForwardProp: (prop) => shouldForwardProp(prop) && !['radius', 'px', 'py'].includes(prop),
})(({ theme, radius = 3, px = 2, py = 1.5 }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: theme.spacing(radius),
        '& input': {
            padding: theme.spacing(py, px),
            fontSize: 
            // pxToRem não está tipado em versões antigas, usa fallback
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            theme.typography.pxToRem
                ? // @ts-expect-error – método não existe nos tipos antigos
                    theme.typography.pxToRem(14)
                : '0.875rem',
            lineHeight: 1.25,
        },
        '& fieldset': { borderColor: theme.palette.grey[400] },
        '&:hover fieldset': { borderColor: theme.palette.primary.main },
        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputLabel-root': {
        fontSize: 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theme.typography.pxToRem
            ? // @ts-expect-error idem
                theme.typography.pxToRem(14)
            : '0.875rem',
        lineHeight: 1.2,
    },
    '& .MuiInputLabel-shrink': {
        transform: 'translate(14px, -6px) scale(0.85)',
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
    width,
    height,
}));
function WhiteCard(props) {
    return jsx(StyledCard, { variant: "outlined", ...props });
}

const GradientBackground = styled$2(Box, {
    shouldForwardProp: (prop) => prop !== 'from' && prop !== 'to' && prop !== 'angle',
})(({ theme, from, to, angle = 135 }) => ({
    minHeight: '100vh',
    width: '100%',
    background: `linear-gradient(${angle}deg, ${from !== null && from !== void 0 ? from : theme.palette.secondary.main} 0%, ${to !== null && to !== void 0 ? to : theme.palette.primary.main} 100%)`,
    position: 'relative',
    overflow: 'hidden',
}));

const Circle = styled$1(Box, {
    shouldForwardProp: (prop) => !['accentColor', 'circleSize', 'circleBorderWidth', 'circleBorderColor'].includes(prop),
})(({ theme, accentColor, circleSize, circleBorderWidth, circleBorderColor }) => ({
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: circleSize,
    height: circleSize,
    borderRadius: '50%',
    backgroundColor: accentColor || theme.palette.primary.main,
    color: theme.palette.getContrastText(accentColor || theme.palette.primary.main),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: circleSize * 0.35,
    border: `${circleBorderWidth}px solid ${circleBorderColor}`,
    boxSizing: 'border-box',
}));
const InfoStepCard = ({ step, title, description, accentColor, backgroundColor, circleSize = 88, circleBorderWidth = 6, circleBorderColor = '#fff', cardProps, }) => {
    const topSpacing = circleSize / 2; // espaço para o círculo “entrar” no cartão
    return (jsxs(Box, { position: "relative", textAlign: "center", mt: topSpacing, children: [jsx(Circle, { accentColor: accentColor || '', circleSize: circleSize, circleBorderWidth: circleBorderWidth, circleBorderColor: circleBorderColor, children: step }), jsxs(WhiteCard, { sx: {
                    pt: topSpacing, // mais 16 px para afastar o texto do círculo
                    pb: 4,
                    px: 5,
                    border: 'none',
                    backgroundColor,
                    ...cardProps === null || cardProps === void 0 ? void 0 : cardProps.sx,
                }, ...cardProps, children: [jsx(Typography, { variant: "h6", component: "h3", gutterBottom: true, children: title }), jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-line' }, children: description })] })] }));
};

const HowItWorksSection = ({ steps, orientation = 'vertical', spacing = 6, sx, }) => {
    if (!(steps === null || steps === void 0 ? void 0 : steps.length))
        return null;
    return (jsx(Box, { width: "100%", children: jsx(Stack, { direction: orientation === 'horizontal' ? 'row' : 'column', spacing: spacing, alignItems: "center", justifyContent: "center", sx: sx, children: steps.map((step, idx) => (jsx(InfoStepCard, { ...step }, idx))) }) }));
};

export { BaseTextField, BibliotecarioThemeProvider, EmailField, GradientBackground, HowItWorksSection, InfoStepCard, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, WhiteCard, theme };
//# sourceMappingURL=index.js.map
