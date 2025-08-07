import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { styled, Button, alpha, ThemeProvider, CssBaseline, TextField, InputAdornment, IconButton, Divider, Typography, Link, Card, Box, Stack, FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, RadioGroup, Radio, Avatar, Tooltip, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { shouldForwardProp, styled as styled$1 } from '@mui/system';
import { createTheme, styled as styled$2 } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import { useState, forwardRef, useRef, useEffect } from 'react';
import { VisibilityOff, Visibility } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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

// /* Primeira palete de cores */
// const palette = {
//   primary:{ main: '#8DC63F', contrastText: '#ffffff' }, // verde
//   secondary:  { main: '#7D3F98', contrastText: '#ffffff' }, // roxo
//   background: {
//     default: '#fafafa',
//     paper:   '#ffffff',
//   },
// };
// /* palete de cores pedida 1 */
// const palette = {
//   primary:{ main: '#ef5b2a', contrastText: '#ffffff' }, // verde
//   secondary:  { main: '#413f7f', contrastText: '#ffffff' }, // roxo
//   // secondaryComplement:  { main: '#5758a7', contrastText: '#ffffff' }, // roxo
//   background: {
//     default: '#fafafa',
//     paper:   '#ffffff',
//   },
// };
// /* palete de cores pedida 2 */
// const palette2 = {
//   primary:{ main: '#05a79e', contrastText: '#ffffff' }, // verde
//   secondary:  { main: '#f6941f', contrastText: '#ffffff' }, // roxo
//   // secondaryComplement:  { main: '#fab041', contrastText: '#ffffff' }, // roxo
//   background: {
//     default: '#fafafa',
//     paper:   '#ffffff',
//   },
// };
const palette = {
    primary: { main: '#05a79e', contrastText: '#ffffff' }, // verde
    secondary: { main: '#413f7f', contrastText: '#ffffff' }, // roxo
    // secondaryComplement:  { main: '#5758a7', contrastText: '#ffffff' }, // roxo
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
            marginBottom: '0em',
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
    return (jsxs(Box, { position: "relative", textAlign: "center", mt: 2, width: "100%", children: [jsx(Circle, { accentColor: accentColor || '', circleSize: circleSize, circleBorderWidth: circleBorderWidth, circleBorderColor: circleBorderColor, marginTop: '1em', children: step }), jsxs(WhiteCard, { sx: {
                    width: '100%', // ← garante 100% de largura
                    pt: '3em',
                    padding: '3em',
                    pb: 3,
                    px: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    border: 'none',
                    marginTop: '2em',
                    backgroundColor,
                    ...cardProps === null || cardProps === void 0 ? void 0 : cardProps.sx,
                }, children: [jsx(Typography, { variant: "h6", component: "h3", gutterBottom: true, children: title }), jsx(Typography, { variant: "body2", sx: { whiteSpace: 'pre-line' }, children: description })] })] }));
};

const HowItWorksSection = ({ steps, orientation = 'vertical', spacing = 6, sx, }) => {
    if (!(steps === null || steps === void 0 ? void 0 : steps.length))
        return null;
    return (jsx(Box, { width: "100%", children: jsx(Stack, { direction: orientation === 'horizontal' ? 'row' : 'column', spacing: spacing, alignItems: "stretch", justifyContent: "center", sx: sx, children: steps.map((step, idx) => {
                var _a;
                const mergedCardProps = {
                    ...step.cardProps,
                    sx: {
                        ...(((_a = step.cardProps) === null || _a === void 0 ? void 0 : _a.sx) || {}),
                        minHeight: 'auto',
                    },
                };
                return (jsx(InfoStepCard, { ...step, cardProps: mergedCardProps }, idx));
            }) }) }));
};

var logoPng = "assets/Logo-1bd6ed58a5ee90c3.png";

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".logo{margin:40px auto;width:340px}.logo__img{display:block;height:auto;width:100%}";
styleInject(css_248z);

const Logo = () => (jsx("div", { className: "logo", children: jsx("img", { className: "logo__img", src: logoPng, alt: "BLIFA \u2014 Bibliotec\u00E1rio de Fam\u00EDlia" }) }));

const SelectableOptions = ({ label, options, value, onChange, variant = 'checkbox', row = false, sx, }) => {
    const isCheckbox = variant === 'checkbox';
    const handleChange = (optionValue) => (_, checked) => {
        if (isCheckbox) {
            const newValue = Array.isArray(value) ? [...value] : [];
            checked
                ? newValue.push(optionValue)
                : newValue.splice(newValue.indexOf(optionValue), 1);
            onChange(newValue);
        }
        else {
            onChange(optionValue);
        }
    };
    return (jsxs(FormControl, { component: "fieldset", sx: sx, children: [label && jsx(FormLabel, { component: "legend", children: label }), isCheckbox ? (jsx(FormGroup, { row: row, children: options.map(({ value: v, label: l }) => (jsx(FormControlLabel, { control: jsx(Checkbox, { checked: Array.isArray(value) && value.includes(v), onChange: handleChange(v) }), label: l }, v))) })) : (jsx(RadioGroup, { row: row, value: value, onChange: (_, val) => onChange(val), children: options.map(({ value: v, label: l }) => (jsx(FormControlLabel, { value: v, control: jsx(Radio, {}), label: l }, v))) }))] }));
};

const AvatarUpload = ({ value, onChange, size = 128, showIcon = true, placeholder, sx, }) => {
    const inputRef = useRef(null);
    const [url, setUrl] = useState(value !== null && value !== void 0 ? value : null);
    /* sincroniza valor controlado */
    useEffect(() => {
        value !== undefined && setUrl(value);
    }, [value]);
    /* liberta blob URL quando o componente desmonta */
    useEffect(() => {
        return () => {
            url && url.startsWith('blob:') && URL.revokeObjectURL(url);
        };
    }, [url]);
    const handleFile = (e) => {
        var _a;
        const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        const newUrl = URL.createObjectURL(file);
        setUrl(newUrl);
        onChange === null || onChange === void 0 ? void 0 : onChange(file, newUrl);
    };
    return (jsxs(Box, { position: "relative", width: size, height: size, sx: sx, children: [jsx(Avatar, { src: url !== null && url !== void 0 ? url : undefined, sx: { width: size, height: size, fontSize: size * 0.4 }, children: placeholder !== null && placeholder !== void 0 ? placeholder : '•' }), showIcon && (jsx(IconButton, { size: "small", sx: {
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'background.paper' },
                }, onClick: () => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, children: jsx(PhotoCameraIcon, { fontSize: "small" }) })), jsx("input", { ref: inputRef, type: "file", accept: "image/*", hidden: true, onChange: handleFile })] }));
};

const AvatarListItem = ({ avatarSrc, label, actions = [
    { icon: jsx(EditIcon, {}), tooltip: 'Editar' },
    { icon: jsx(DeleteIcon, {}), tooltip: 'Remover' },
], avatarSize = 48, sx, }) => (jsxs(Box, { display: "flex", alignItems: "center", gap: 2, sx: sx, children: [jsx(Avatar, { src: avatarSrc, sx: { width: avatarSize, height: avatarSize, flexShrink: 0 } }), jsx(Typography, { variant: "body1", sx: { flexGrow: 1 }, children: label }), actions.map(({ icon, tooltip, onClick, disabled }, idx) => tooltip ? (jsx(Tooltip, { title: tooltip, children: jsx("span", { children: jsx(IconButton, { onClick: onClick, disabled: disabled, size: "small", color: "inherit", children: icon }) }) }, idx)) : (jsx(IconButton, { onClick: onClick, disabled: disabled, size: "small", color: "inherit", children: icon }, idx)))] }));

/* ---------- Constantes de estilo ---------- */
const OPEN = 260;
const CLOSED = 64;
/* cor da linha seleccionada */
const selectedSX = {
    bgcolor: '#EEF3FF',
    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
        color: 'primary.main',
        fontWeight: 600,
    },
};
/* ---------- Componente ---------- */
const SidebarMenu = ({ items, footerItems, open: controlled, onToggle, sx, }) => {
    const [internal, setInternal] = useState(true);
    const open = controlled !== null && controlled !== void 0 ? controlled : internal;
    const toggle = () => (onToggle ? onToggle(!open) : setInternal(!open));
    /* render helper */
    const render = (arr) => arr.map(({ label, icon, selected, ...rest }) => (jsx(Tooltip, { title: !open ? label : '', placement: "right", arrow: true, disableInteractive: true, children: jsxs(ListItemButton, { sx: { px: 2, my: 0.5, borderRadius: 1, ...(selected && selectedSX) }, ...rest, children: [jsx(ListItemIcon, { sx: {
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                    }, children: icon }), open && jsx(ListItemText, { primary: label })] }) }, label)));
    return (jsxs(Drawer, { variant: "permanent", PaperProps: {
            sx: {
                width: open ? OPEN : CLOSED,
                overflowX: 'visible',
                borderRadius: '0 8px 8px 0',
                boxShadow: '0 4px 24px rgba(0,0,0,.08)',
                transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
                display: 'flex',
                flexDirection: 'column',
                ...sx,
            },
        }, children: [jsx(IconButton, { size: "small", onClick: toggle, sx: {
                    position: 'absolute',
                    top: 12,
                    right: -16,
                    transform: 'translateX(50%)',
                    bgcolor: '#fff',
                    border: '1px solid #E0E0E0',
                    boxShadow: 1,
                    zIndex: 1,
                    '&:hover': { bgcolor: '#fff' },
                }, children: open ? jsx(ChevronLeftIcon, { fontSize: "small" }) : jsx(ChevronRightIcon, { fontSize: "small" }) }), jsxs(Stack, { alignItems: "center", spacing: open ? 1 : 0, mt: 3, mb: 2, children: [jsx(Box, { component: "img", src: "https://placehold.co/40x40/000/fff" // troca pelo avatar real
                        , width: 40, height: 40, borderRadius: "50%" }), open && (jsxs(Fragment, { children: [jsxs(Stack, { spacing: 0, alignItems: "center", children: [jsx(Typography, { fontWeight: 700, fontSize: 14, children: "Alexandre Brissos" }), jsx(Typography, { variant: "caption", color: "text.secondary", children: "TUTOR" })] }), jsx(Divider, { sx: { width: '100%', mt: 1 } })] }))] }), jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(items) }), !!(footerItems === null || footerItems === void 0 ? void 0 : footerItems.length) && (jsx(Box, { mt: "auto", pb: 2, children: jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(footerItems) }) }))] }));
};

export { AvatarListItem, AvatarUpload, BaseTextField, BibliotecarioThemeProvider, EmailField, GradientBackground, HowItWorksSection, InfoStepCard, Logo, NumericField, PasswordField, PrimaryButton, RouteLink, SecondaryButton, SectionDivider, SelectableOptions, SidebarMenu, WhiteCard, theme };
//# sourceMappingURL=index.js.map
