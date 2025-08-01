import { jsx, jsxs } from 'react/jsx-runtime';
import { styled, Button, alpha, ThemeProvider, CssBaseline, TextField, InputAdornment, IconButton } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import { useState } from 'react';
import { VisibilityOff, Visibility } from '@mui/icons-material';

/**
 * Botão principal da aplicação.
 * - Raio de canto consistente com o tema
 * - Hover subtil (90 % da cor primária)
 * - Desactiva a sombra normal do MUI
 * - Estado :disabled harmonizado com o tema
 * - Outline visível para acessibilidade (focus-visible)
 */
const StyledPrimaryButton = styled(Button)(({ theme }) => ({
    borderRadius: theme.spacing(4), // 32 px se spacing = 8
    paddingInline: theme.spacing(3), // horizontal 24 px
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
    return (jsx(StyledPrimaryButton, { variant: "contained", color: "primary", disableElevation: true, ...props }));
}

// src/components/Button/SecondaryButton.tsx
const SecondaryButton = styled(Button)(({ theme }) => ({
    borderRadius: 32,
    paddingInline: theme.spacing(3),
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

const BaseTextField = styled((props) => (jsx(TextField, { variant: "outlined", fullWidth: true, ...props })))(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: theme.spacing(3), // 24 px se spacing=8
        '& fieldset': { borderColor: theme.palette.grey[400] },
        '&:hover fieldset': { borderColor: theme.palette.primary.main },
        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputBase-input': { padding: theme.spacing(1.5, 2) },
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

export { BibliotecarioThemeProvider, EmailField, NumericField, PasswordField, PrimaryButton, SecondaryButton, theme };
//# sourceMappingURL=index.js.map
