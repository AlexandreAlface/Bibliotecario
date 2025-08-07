import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { styled, Button, alpha, ThemeProvider, CssBaseline, TextField, InputAdornment, IconButton, Divider, Typography, Link, Card, Box, Stack, FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, RadioGroup, Radio, Avatar, Tooltip, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Badge, Menu, ListItem, MenuItem, InputLabel, Select, ListItemAvatar, LinearProgress, linearProgressClasses, Popper, ClickAwayListener, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from '@mui/material';
import { shouldForwardProp, styled as styled$1 } from '@mui/system';
import { createTheme, styled as styled$2 } from '@mui/material/styles';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import { useState, forwardRef, useRef, useEffect, useMemo } from 'react';
import { VisibilityOff, Visibility } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import DoneIcon from '@mui/icons-material/Done';

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

const Handle = styled(IconButton)({
    position: 'fixed',
    transform: 'translate(-50%, -50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid #E0E0E0',
    boxShadow: '0 2px 6px rgba(0,0,0,.15)',
    zIndex: 1301,
    '&:hover': { background: '#fff' },
});
const getTop = (v) => {
    if (typeof v === 'number')
        return v;
    if (v === 'top')
        return 40; // 40 px do topo
    if (v === 'bottom')
        return 'calc(100% - 40px)'; // 40 px do fundo
    return '50%'; // center (default)
};
const SidebarToggle = ({ open, openWidth, closedWidth, onToggle, vertical = 'center', }) => (jsx(Handle, { onClick: onToggle, sx: {
        left: open ? openWidth : closedWidth,
        top: getTop(vertical),
    }, children: open ? jsx(ChevronLeftIcon, { fontSize: "small" }) : jsx(ChevronRightIcon, { fontSize: "small" }) }));

/* ---------- Constantes ---------- */
const OPEN = 260;
const CLOSED = 64;
const selectedSX = {
    bgcolor: '#EEF3FF',
    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
        color: 'primary.main',
        fontWeight: 600,
    },
};
/* ---------- Componente ---------- */
const SidebarMenu = ({ items, footerItems, open: controlled, onToggle, toggleVertical = 'center', sx, }) => {
    const [internal, setInternal] = useState(true);
    const open = controlled !== null && controlled !== void 0 ? controlled : internal;
    const toggle = () => (onToggle ? onToggle(!open) : setInternal(!open));
    const render = (arr) => arr.map(({ label, icon, selected, ...rest }) => (jsx(Tooltip, { title: !open ? label : '', placement: "right", arrow: true, disableInteractive: true, children: jsxs(ListItemButton, { sx: {
                my: 0.5,
                borderRadius: 1,
                px: open ? 2 : 0, // sem “padding” lateral quando fechado
                justifyContent: open ? 'flex-start' : 'center',
                ...(selected && selectedSX),
            }, ...rest, children: [jsx(ListItemIcon, { sx: {
                        minWidth: 0,
                        mr: open ? 2 : '0',
                        justifyContent: 'center',
                    }, children: icon }), open && jsx(ListItemText, { primary: label })] }) }, label)));
    return (jsxs(Fragment, { children: [jsxs(Drawer, { variant: "permanent", PaperProps: {
                    sx: {
                        width: open ? OPEN : CLOSED,
                        overflowX: 'clip', // evita barra horizontal
                        borderRadius: '0 8px 8px 0',
                        boxShadow: '0 4px 24px rgba(0,0,0,.08)',
                        transition: (t) => t.transitions.create('width', {
                            duration: t.transitions.duration.shorter,
                        }),
                        display: 'flex',
                        flexDirection: 'column',
                        ...sx,
                    },
                }, children: [jsxs(Stack, { position: "relative", alignItems: "center", spacing: 1, mt: 3, mb: 2, children: [jsx(Box, { component: "img", src: "https://placehold.co/40", width: 40, height: 40, borderRadius: "50%" }), open && (jsxs(Fragment, { children: [jsx(Typography, { fontWeight: 700, fontSize: 14, children: "Alexandre Brissos" }), jsx(Typography, { variant: "caption", color: "text.secondary", children: "TUTOR" }), jsx(Divider, { sx: { width: '100%', mt: 1 } })] }))] }), jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(items) }), !!(footerItems === null || footerItems === void 0 ? void 0 : footerItems.length) && (jsx(Box, { mt: "auto", pb: 2, children: jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(footerItems) }) }))] }), jsx(SidebarToggle, { open: open, openWidth: OPEN, closedWidth: CLOSED, vertical: toggleVertical, onToggle: toggle })] }));
};

const NotificationBell = ({ items, onSelect, onRemove, onClearAll, showZero = false, ...iconButtonProps }) => {
    const [anchor, setAnchor] = useState(null);
    const open = Boolean(anchor);
    const unread = items.filter((i) => !i.lida).length;
    return (jsxs(Fragment, { children: [jsx(Tooltip, { title: "Notifica\u00E7\u00F5es", children: jsx(IconButton, { ...iconButtonProps, onClick: (e) => setAnchor(e.currentTarget), size: "large", children: jsx(Badge, { color: "error", badgeContent: unread, invisible: !showZero && unread === 0, children: jsx(NotificationsNoneIcon, {}) }) }) }), jsxs(Menu, { anchorEl: anchor, open: open, onClose: () => setAnchor(null), PaperProps: { sx: { width: 300, maxHeight: 360, p: 0 } }, children: [jsx(Box, { px: 2, py: 1.5, children: jsx(Typography, { fontWeight: 600, children: "Notifica\u00E7\u00F5es" }) }), jsx(Divider, {}), items.length === 0 ? (jsx(Box, { p: 3, textAlign: "center", children: jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sem notifica\u00E7\u00F5es." }) })) : (jsx(List, { dense: true, disablePadding: true, children: items.map((n) => (jsx(ListItem, { alignItems: "flex-start", secondaryAction: onRemove && (jsx(IconButton, { edge: "end", size: "small", onClick: () => onRemove(n.id), children: jsx(DeleteOutlineIcon, { fontSize: "small" }) })), sx: {
                                bgcolor: n.lida ? 'background.paper' : 'action.hover',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.selected' },
                            }, onClick: () => {
                                onSelect === null || onSelect === void 0 ? void 0 : onSelect(n);
                                setAnchor(null);
                            }, children: jsx(ListItemText, { primary: jsx(Typography, { variant: "body2", fontWeight: n.lida ? 400 : 600, children: n.titulo }), secondary: n.mensagem && (jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: n.mensagem })) }) }, n.id))) })), !!items.length && (jsxs(Fragment, { children: [jsx(Divider, {}), jsx(MenuItem, { onClick: () => onClearAll === null || onClearAll === void 0 ? void 0 : onClearAll(), children: jsx(Typography, { variant: "body2", textAlign: "center", width: "100%", children: "Limpar todas" }) })] }))] })] }));
};

const AvatarSelect = ({ label, options, value, onChange, disabled = false, placeholderAvatar, minWidth, }) => {
    const current = options.find((o) => o.id === value);
    /* devolve só o id */
    const handle = (e) => onChange(e.target.value);
    const Placeholder = (jsxs(Box, { display: "flex", alignItems: "center", gap: 1, color: "text.secondary", children: [jsx(Avatar, { sx: { width: 24, height: 24, bgcolor: '#E0E0E0' }, children: placeholderAvatar !== null && placeholderAvatar !== void 0 ? placeholderAvatar : jsx(PersonOutlineIcon, { fontSize: "small" }) }), label] }));
    return (jsxs(FormControl, { fullWidth: true, variant: "standard", disabled: disabled, sx: { minWidth }, children: [jsx(InputLabel, { shrink: true, children: label }), jsx(Select, { value: value, onChange: handle, renderValue: () => value && current ? (jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [jsx(Avatar, { src: current.avatar, sx: { width: 24, height: 24 }, children: current.nome[0] }), current.nome] })) : (Placeholder), children: options.map((o) => (jsx(MenuItem, { value: o.id, children: jsxs(ListItem, { disableGutters: true, children: [jsx(ListItemAvatar, { sx: { minWidth: 32 }, children: jsx(Avatar, { src: o.avatar, sx: { width: 32, height: 32, marginRight: '1em' }, children: o.nome[0] }) }), jsx(ListItemText, { primary: o.nome })] }) }, o.id))) })] }));
};

/**
 * Barra de progresso animada para o Quiz.
 */
const QuizProgressBar = ({ passo, total, mostrarTexto = true, }) => {
    /* evita divisões por zero */
    const pct = useMemo(() => (total > 0 ? (passo / total) * 100 : 0), [passo, total]);
    return (jsxs(Box, { children: [mostrarTexto && (jsxs(Typography, { variant: "caption", mb: 0.5, display: "block", children: [Math.round(pct), "% conclu\u00EDdo"] })), jsx(LinearProgress, { variant: "determinate", value: pct, sx: {
                    height: 8,
                    borderRadius: 4,
                    [`&.${linearProgressClasses.colorPrimary}`]: {
                        bgcolor: '#E4E4E4',
                    },
                    [`& .${linearProgressClasses.bar}`]: {
                        borderRadius: 4,
                        /* animação suave */
                        transition: 'transform .4s ease-out',
                        bgcolor: 'primary.main',
                    },
                } })] }));
};

function ColumnFilterPopper({ open, anchorEl, values, selected, onClose, onApply, }) {
    const [query, setQuery] = useState('');
    const [local, setLocal] = useState(new Set(selected));
    useEffect(() => {
        if (open)
            setLocal(new Set(selected));
    }, [open, selected]);
    const list = useMemo(() => values.filter((v) => String(v !== null && v !== void 0 ? v : '')
        .toLowerCase()
        .includes(query.toLowerCase())), [values, query]);
    const toggle = (v) => {
        const next = new Set(local);
        next.has(v) ? next.delete(v) : next.add(v);
        setLocal(next);
    };
    return (jsx(Popper, { open: open, anchorEl: anchorEl, placement: "bottom-start", children: jsx(ClickAwayListener, { onClickAway: onClose, children: jsxs(Box, { bgcolor: "#fff", borderRadius: 1, boxShadow: 3, p: 2, maxHeight: 300, overflow: "auto", minWidth: 220, children: [jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [jsx(Typography, { variant: "subtitle2", children: "Filtrar" }), jsx(IconButton, { size: "small", onClick: () => setLocal(new Set()), children: jsx(ClearIcon, { fontSize: "inherit" }) })] }), jsx(TextField, { size: "small", placeholder: "Pesquisar\u2026", fullWidth: true, value: query, onChange: (e) => setQuery(e.target.value), sx: { mb: 1 } }), list.map((v) => (jsxs(MenuItem, { onClick: () => toggle(v), children: [jsx(Checkbox, { size: "small", checked: local.has(v), sx: { mr: 1 } }), String(v !== null && v !== void 0 ? v : '—')] }, String(v)))), jsx(Box, { textAlign: "right", mt: 1, children: jsx(IconButton, { size: "small", color: "primary", onClick: () => (onApply(local), onClose()), children: jsx(DoneIcon, { fontSize: "inherit" }) }) })] }) }) }));
}

function SimpleDataTable({ columns, rows, rowsPerPageOptions = [5, 10, 25], sx, }) {
    var _a;
    /* paginação */
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(rowsPerPageOptions[0]);
    /* filtros */
    const [filters, setFilters] = useState({});
    const [anchor, setAnchor] = useState(null);
    const [colFilter, setColFilter] = useState(null);
    /* aplica filtros activos */
    const filteredRows = rows.filter((r) => columns.every((c) => {
        var _a;
        const active = filters[c.label];
        if (!(active === null || active === void 0 ? void 0 : active.size))
            return true;
        const val = c.field ? r[c.field] : (_a = c.render) === null || _a === void 0 ? void 0 : _a.call(c, r);
        return active.has(val);
    }));
    /* paginação calculada */
    const slice = filteredRows.slice(page * perPage, page * perPage + perPage);
    /* open popper */
    const openFilter = (el, col) => {
        setAnchor(el);
        setColFilter(col);
    };
    /* valores únicos da coluna */
    const colValues = colFilter
        ? [...new Set(rows.map((r) => (colFilter.field ? r[colFilter.field] : colFilter.render(r))))]
        : [];
    return (jsxs(Paper, { sx: { width: '100%', overflow: 'hidden', ...sx }, children: [jsx(TableContainer, { children: jsxs(Table, { children: [jsx(TableHead, { children: jsx(TableRow, { children: columns.map((c) => {
                                    var _a;
                                    return (jsx(TableCell, { align: c.align, sx: { width: c.width, fontWeight: 700, ...c.sx }, children: jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", sx: { cursor: c.filterable ? 'pointer' : 'default' }, onClick: c.filterable
                                                ? (e) => openFilter(e.currentTarget, c)
                                                : undefined, children: [c.label, c.filterable && (jsx(FilterAltIcon, { fontSize: "small", color: ((_a = filters[c.label]) === null || _a === void 0 ? void 0 : _a.size) ? 'primary' : 'inherit' }))] }) }, c.label));
                                }) }) }), jsx(TableBody, { children: slice.map((row, i) => (jsx(TableRow, { children: columns.map((c) => (jsx(TableCell, { align: c.align, children: c.render ? c.render(row) : row[c.field] }, String(c.label)))) }, i))) })] }) }), jsx(TablePagination, { component: "div", rowsPerPageOptions: rowsPerPageOptions, count: filteredRows.length, rowsPerPage: perPage, page: page, onPageChange: (_, p) => setPage(p), onRowsPerPageChange: (e) => {
                    setPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }, labelRowsPerPage: "Items por p\u00E1gina:" }), colFilter && (jsx(ColumnFilterPopper, { open: true, anchorEl: anchor, values: colValues, selected: (_a = filters[colFilter.label]) !== null && _a !== void 0 ? _a : new Set(), onClose: () => setColFilter(null), onApply: (set) => setFilters({ ...filters, [colFilter.label]: set }) }))] }));
}

export { AvatarListItem, AvatarSelect, AvatarUpload, BaseTextField, BibliotecarioThemeProvider, EmailField, GradientBackground, HowItWorksSection, InfoStepCard, Logo, NotificationBell, NumericField, PasswordField, PrimaryButton, QuizProgressBar, RouteLink, SecondaryButton, SectionDivider, SelectableOptions, SidebarMenu, SimpleDataTable, WhiteCard, theme };
//# sourceMappingURL=index.js.map
