import { styled, Button, alpha, TextField as TextField$1, Link, Card, Box, IconButton as IconButton$1, ThemeProvider, CssBaseline, Divider, Typography, Stack, FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, RadioGroup, Radio, Avatar, Tooltip, Drawer, List, Badge, Menu, ListItem, ListItemText, MenuItem, InputLabel, Select, ListItemAvatar, LinearProgress, linearProgressClasses, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TablePagination, useTheme, CardMedia, CardContent, Rating, Collapse, Chip, ListItemButton, ListItemIcon, Popper, ClickAwayListener } from '@mui/material';
import { createTheme, styled as styled$2 } from '@mui/material/styles';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { shouldForwardProp, styled as styled$1 } from '@mui/system';
import { forwardRef, useState, useRef, useEffect, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
import Grid from '@mui/material/GridLegacy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';

// src/ThemeProvider.tsx
var palette = {
  primary: { main: "#05a79e", contrastText: "#ffffff" },
  // verde
  secondary: { main: "#f6941f", contrastText: "#ffffff" },
  // roxo
  // secondaryComplement:  { main: '#fab041', contrastText: '#ffffff' }, // roxo
  background: {
    default: "#fafafa",
    paper: "#ffffff"
  }
};
var theme = createTheme({
  palette,
  typography: {
    fontFamily: "Poppins, Arial, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    button: { textTransform: "none", fontWeight: 500 }
  },
  shape: { borderRadius: 16 },
  components: {
    /* exemplo de override global */
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 32, paddingInline: 24 }
      },
      defaultProps: {
        disableElevation: true
      }
    }
  }
});
function BibliotecarioThemeProvider({ children }) {
  return /* @__PURE__ */ jsxs(ThemeProvider, { theme, children: [
    /* @__PURE__ */ jsx(CssBaseline, {}),
    children
  ] });
}
var Styled = styled(Button, {
  // Impede que props customizadas vão parar ao DOM
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "radius" && prop !== "px"
})(({ theme: theme2, radius = 4, px = 3 }) => ({
  borderRadius: theme2.spacing(radius),
  paddingInline: theme2.spacing(px),
  textTransform: "none",
  fontWeight: 600,
  boxShadow: "none",
  lineHeight: 1.5,
  "&:hover": {
    backgroundColor: alpha(theme2.palette.primary.main, 0.9),
    boxShadow: "none"
  },
  "&:disabled": {
    backgroundColor: theme2.palette.action.disabledBackground,
    color: theme2.palette.action.disabled
  },
  "&.Mui-focusVisible": {
    outline: `2px solid ${alpha(theme2.palette.primary.light, 0.8)}`,
    outlineOffset: 2
  }
}));
function PrimaryButton(props) {
  return /* @__PURE__ */ jsx(
    Styled,
    {
      variant: "contained",
      color: "primary",
      disableElevation: true,
      ...props
    }
  );
}
var Styled2 = styled(Button, {
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "radius" && prop !== "px"
})(({ theme: theme2, radius = 4, px = 3 }) => ({
  borderRadius: theme2.spacing(radius),
  paddingInline: theme2.spacing(px),
  textTransform: "none",
  fontWeight: 500,
  backgroundColor: theme2.palette.common.white,
  color: theme2.palette.primary.main,
  border: `2px solid ${theme2.palette.primary.main}`,
  "&:hover": {
    backgroundColor: theme2.palette.primary.main,
    color: theme2.palette.common.white,
    borderColor: theme2.palette.primary.main
  },
  "&:disabled": {
    backgroundColor: theme2.palette.action.disabledBackground,
    color: theme2.palette.action.disabled,
    borderColor: theme2.palette.action.disabledBackground
  }
}));
function SecondaryButton(props) {
  return /* @__PURE__ */ jsx(Styled2, { variant: "outlined", ...props });
}
var EmailField = forwardRef(function EmailField2({ inputRef, ...props }, ref) {
  return /* @__PURE__ */ jsx(
    TextField,
    {
      ...props,
      type: "email",
      variant: "outlined",
      fullWidth: true,
      inputRef: ref != null ? ref : inputRef
    }
  );
});
var BaseTextField = styled$1(TextField$1, {
  shouldForwardProp: (prop) => shouldForwardProp(prop) && !["radius", "px", "py"].includes(prop)
})(
  ({ theme: theme2, radius = 3, px = 2, py = 1.5 }) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: theme2.spacing(radius),
      "& input": {
        padding: theme2.spacing(py, px),
        fontSize: (
          // pxToRem não está tipado em versões antigas, usa fallback
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          theme2.typography.pxToRem ? (
            // @ts-expect-error – método não existe nos tipos antigos
            theme2.typography.pxToRem(14)
          ) : "0.875rem"
        ),
        lineHeight: 1.25
      },
      "& fieldset": { borderColor: theme2.palette.grey[400] },
      "&:hover fieldset": { borderColor: theme2.palette.primary.main },
      "&.Mui-focused fieldset": { borderColor: theme2.palette.primary.main }
    },
    "& .MuiInputLabel-root": {
      fontSize: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theme2.typography.pxToRem ? (
          // @ts-expect-error idem
          theme2.typography.pxToRem(14)
        ) : "0.875rem"
      ),
      lineHeight: 1.2
    },
    "& .MuiInputLabel-shrink": {
      transform: "translate(14px, -6px) scale(0.85)"
    }
  })
);
function NumericField(props) {
  return /* @__PURE__ */ jsx(
    BaseTextField,
    {
      label: "N\xFAmero de telem\xF3vel",
      type: "tel",
      inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
      ...props
    }
  );
}
var PasswordField = forwardRef(function PasswordField2({ InputProps, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return /* @__PURE__ */ jsx(
    TextField,
    {
      ...rest,
      type: show ? "text" : "password",
      variant: "outlined",
      fullWidth: true,
      inputRef: ref,
      InputProps: {
        ...InputProps,
        endAdornment: /* @__PURE__ */ jsx(InputAdornment, { position: "end", children: /* @__PURE__ */ jsx(IconButton, { onClick: () => setShow((s) => !s), edge: "end", "aria-label": "alternar visibilidade", children: show ? /* @__PURE__ */ jsx(VisibilityOff, {}) : /* @__PURE__ */ jsx(Visibility, {}) }) })
      }
    }
  );
});
function SectionDivider({
  label,
  width = "100%",
  thickness = 1,
  spacingY = 3,
  sx
}) {
  return /* @__PURE__ */ jsx(
    Divider,
    {
      textAlign: "center",
      sx: {
        width,
        my: spacingY,
        borderBottomWidth: thickness,
        marginBottom: "0em",
        ...sx
      },
      children: /* @__PURE__ */ jsx(
        Typography,
        {
          variant: "body2",
          color: "text.secondary",
          fontWeight: 500,
          sx: { px: 1 },
          children: label
        }
      )
    }
  );
}
var StyledLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "underlineThickness" && prop !== "weight"
})(({ theme: theme2, underlineThickness = 1, weight = 500 }) => ({
  ...theme2.typography.body2,
  fontWeight: weight,
  color: theme2.palette.text.primary,
  textDecoration: "none",
  position: "relative",
  display: "inline-block",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    height: underlineThickness,
    backgroundColor: "currentColor",
    transition: "opacity .2s",
    opacity: 1
  },
  "&:hover::after": { opacity: 0.6 },
  "&:focus-visible": {
    outline: `2px solid ${theme2.palette.primary.light}`,
    outlineOffset: 2
  }
}));
var RouteLink = forwardRef(
  function RouteLink2(props, ref) {
    return /* @__PURE__ */ jsx(StyledLink, { ref, ...props });
  }
);
var StyledCard = styled(Card, {
  shouldForwardProp: (prop) => shouldForwardProp(prop) && prop !== "width" && prop !== "height"
})(({ theme: theme2, width, height }) => ({
  borderRadius: theme2.spacing(3),
  /* 24 px se spacing = 8 */
  padding: theme2.spacing(4),
  /* 32 px */
  backgroundColor: theme2.palette.common.white,
  width,
  height
}));
function WhiteCard(props) {
  return /* @__PURE__ */ jsx(StyledCard, { variant: "outlined", ...props });
}
var GradientBackground = styled$2(Box, {
  shouldForwardProp: (prop) => prop !== "from" && prop !== "to" && prop !== "angle"
})(({ theme: theme2, from, to, angle = 135 }) => ({
  minHeight: "100vh",
  width: "100%",
  background: `linear-gradient(${angle}deg, ${from != null ? from : theme2.palette.secondary.main} 0%, ${to != null ? to : theme2.palette.primary.main} 100%)`,
  position: "relative",
  overflow: "hidden"
}));
var Circle = styled$1(Box, {
  shouldForwardProp: (prop) => !["accentColor", "circleSize", "circleBorderWidth", "circleBorderColor"].includes(
    prop
  )
})(({ theme: theme2, accentColor, circleSize, circleBorderWidth, circleBorderColor }) => ({
  position: "absolute",
  top: 0,
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: circleSize,
  height: circleSize,
  borderRadius: "50%",
  backgroundColor: accentColor || theme2.palette.primary.main,
  color: theme2.palette.getContrastText(accentColor || theme2.palette.primary.main),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: circleSize * 0.35,
  border: `${circleBorderWidth}px solid ${circleBorderColor}`,
  boxSizing: "border-box"
}));
var InfoStepCard = ({
  step,
  title,
  description,
  accentColor,
  backgroundColor,
  circleSize = 88,
  circleBorderWidth = 6,
  circleBorderColor = "#fff",
  cardProps
}) => {
  return /* @__PURE__ */ jsxs(Box, { position: "relative", textAlign: "center", mt: 2, width: "100%", children: [
    /* @__PURE__ */ jsx(
      Circle,
      {
        accentColor: accentColor || "",
        circleSize,
        circleBorderWidth,
        circleBorderColor,
        marginTop: "1em",
        children: step
      }
    ),
    /* @__PURE__ */ jsxs(
      WhiteCard,
      {
        sx: {
          width: "100%",
          // ← garante 100% de largura
          pt: "3em",
          padding: "3em",
          pb: 3,
          px: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          border: "none",
          marginTop: "2em",
          backgroundColor,
          ...cardProps == null ? void 0 : cardProps.sx
        },
        children: [
          /* @__PURE__ */ jsx(Typography, { variant: "h6", component: "h3", gutterBottom: true, children: title }),
          /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { whiteSpace: "pre-line" }, children: description })
        ]
      }
    )
  ] });
};
var InfoStepCard_default = InfoStepCard;
var HowItWorksSection = ({
  steps,
  orientation = "vertical",
  spacing = 6,
  sx
}) => {
  if (!(steps == null ? void 0 : steps.length)) return null;
  return /* @__PURE__ */ jsx(Box, { width: "100%", children: /* @__PURE__ */ jsx(
    Stack,
    {
      direction: orientation === "horizontal" ? "row" : "column",
      spacing,
      alignItems: "stretch",
      justifyContent: "center",
      sx,
      children: steps.map((step, idx) => {
        var _a;
        const mergedCardProps = {
          ...step.cardProps,
          sx: {
            ...((_a = step.cardProps) == null ? void 0 : _a.sx) || {},
            minHeight: "auto"
          }
        };
        return /* @__PURE__ */ jsx(
          InfoStepCard_default,
          {
            ...step,
            cardProps: mergedCardProps
          },
          idx
        );
      })
    }
  ) });
};

// src/components/Logo/LogoBiblio.svg
var LogoBiblio_default = "./LogoBiblio-OW4T5D4X.svg";
var Logo = ({
  width = "120px",
  height = "auto",
  sx,
  ...boxProps
}) => /* @__PURE__ */ jsx(
  Box,
  {
    component: "img",
    src: LogoBiblio_default,
    alt: "Log\xF3tipo",
    sx: [
      { display: "block", width, height },
      ...Array.isArray(sx) ? sx : [sx]
    ],
    ...boxProps
  }
);
var SelectableOptions = ({
  label,
  options,
  value,
  onChange,
  variant = "checkbox",
  row = false,
  sx
}) => {
  const isCheckbox = variant === "checkbox";
  const handleChange = (optionValue) => (_, checked) => {
    if (isCheckbox) {
      const newValue = Array.isArray(value) ? [...value] : [];
      checked ? newValue.push(optionValue) : newValue.splice(newValue.indexOf(optionValue), 1);
      onChange(newValue);
    } else {
      onChange(optionValue);
    }
  };
  return /* @__PURE__ */ jsxs(FormControl, { component: "fieldset", sx, children: [
    label && /* @__PURE__ */ jsx(FormLabel, { component: "legend", children: label }),
    isCheckbox ? /* @__PURE__ */ jsx(FormGroup, { row, children: options.map(({ value: v, label: l }) => /* @__PURE__ */ jsx(
      FormControlLabel,
      {
        control: /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: Array.isArray(value) && value.includes(v),
            onChange: handleChange(v)
          }
        ),
        label: l
      },
      v
    )) }) : /* @__PURE__ */ jsx(RadioGroup, { row, value, onChange: (_, val) => onChange(val), children: options.map(({ value: v, label: l }) => /* @__PURE__ */ jsx(
      FormControlLabel,
      {
        value: v,
        control: /* @__PURE__ */ jsx(Radio, {}),
        label: l
      },
      v
    )) })
  ] });
};
var AvatarUpload = ({
  value,
  onChange,
  size = 128,
  showIcon = true,
  placeholder,
  sx
}) => {
  const inputRef = useRef(null);
  const [url, setUrl] = useState(value != null ? value : null);
  useEffect(() => {
    value !== void 0 && setUrl(value);
  }, [value]);
  useEffect(() => {
    return () => {
      url && url.startsWith("blob:") && URL.revokeObjectURL(url);
    };
  }, [url]);
  const handleFile = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    const newUrl = URL.createObjectURL(file);
    setUrl(newUrl);
    onChange == null ? void 0 : onChange(file, newUrl);
  };
  return /* @__PURE__ */ jsxs(Box, { position: "relative", width: size, height: size, sx, children: [
    /* @__PURE__ */ jsx(
      Avatar,
      {
        src: url != null ? url : void 0,
        sx: { width: size, height: size, fontSize: size * 0.4 },
        children: placeholder != null ? placeholder : "\u2022"
      }
    ),
    showIcon && /* @__PURE__ */ jsx(
      IconButton$1,
      {
        size: "small",
        sx: {
          position: "absolute",
          bottom: 8,
          right: 8,
          bgcolor: "background.paper",
          boxShadow: 1,
          "&:hover": { bgcolor: "background.paper" }
        },
        onClick: () => {
          var _a;
          return (_a = inputRef.current) == null ? void 0 : _a.click();
        },
        children: /* @__PURE__ */ jsx(PhotoCameraIcon, { fontSize: "small" })
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "image/*",
        hidden: true,
        onChange: handleFile
      }
    )
  ] });
};
var AvatarListItem = ({
  avatarSrc,
  label,
  actions = [
    { icon: /* @__PURE__ */ jsx(EditIcon, {}), tooltip: "Editar" },
    { icon: /* @__PURE__ */ jsx(DeleteIcon, {}), tooltip: "Remover" }
  ],
  avatarSize = 48,
  sx
}) => /* @__PURE__ */ jsxs(
  Box,
  {
    display: "flex",
    alignItems: "center",
    gap: 2,
    sx,
    children: [
      /* @__PURE__ */ jsx(
        Avatar,
        {
          src: avatarSrc,
          sx: { width: avatarSize, height: avatarSize, flexShrink: 0 }
        }
      ),
      /* @__PURE__ */ jsx(Typography, { variant: "body1", sx: { flexGrow: 1 }, children: label }),
      actions.map(
        ({ icon, tooltip, onClick, disabled }, idx) => tooltip ? /* @__PURE__ */ jsx(Tooltip, { title: tooltip, children: /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx(
          IconButton$1,
          {
            onClick,
            disabled,
            size: "small",
            color: "inherit",
            children: icon
          }
        ) }) }, idx) : /* @__PURE__ */ jsx(
          IconButton$1,
          {
            onClick,
            disabled,
            size: "small",
            color: "inherit",
            children: icon
          },
          idx
        )
      )
    ]
  }
);
var Handle = styled(IconButton$1)({
  position: "fixed",
  transform: "translate(-50%, -50%)",
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "#fff",
  border: "1px solid #E0E0E0",
  boxShadow: "0 2px 6px rgba(0,0,0,.15)",
  zIndex: 1301,
  "&:hover": { background: "#fff" }
});
var getTop = (v) => {
  if (typeof v === "number") return v;
  if (v === "top") return 40;
  if (v === "bottom") return "calc(100% - 40px)";
  return "50%";
};
var SidebarToggle = ({
  open,
  openWidth,
  closedWidth,
  onToggle,
  vertical = "center"
}) => /* @__PURE__ */ jsx(
  Handle,
  {
    onClick: onToggle,
    sx: {
      left: open ? openWidth : closedWidth,
      top: getTop(vertical)
    },
    children: open ? /* @__PURE__ */ jsx(ChevronLeftIcon, { fontSize: "small" }) : /* @__PURE__ */ jsx(ChevronRightIcon, { fontSize: "small" })
  }
);
var OPEN = 260;
var CLOSED = 64;
var selectedSX = {
  bgcolor: "#EEF3FF",
  "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
    color: "primary.main",
    fontWeight: 600
  }
};
var SidebarMenu = ({
  items,
  footerItems,
  open: controlled,
  onToggle,
  toggleVertical = "center",
  sx
}) => {
  const [internal, setInternal] = useState(true);
  const open = controlled != null ? controlled : internal;
  const toggle = () => onToggle ? onToggle(!open) : setInternal(!open);
  const render = (arr) => arr.map(({ label, icon, selected, ...rest }) => /* @__PURE__ */ jsx(
    Tooltip,
    {
      title: !open ? label : "",
      placement: "right",
      arrow: true,
      disableInteractive: true,
      children: /* @__PURE__ */ jsxs(
        ListItemButton,
        {
          sx: {
            my: 0.5,
            borderRadius: 1,
            px: open ? 2 : 0,
            // sem “padding” lateral quando fechado
            justifyContent: open ? "flex-start" : "center",
            ...selected && selectedSX
          },
          ...rest,
          children: [
            /* @__PURE__ */ jsx(
              ListItemIcon,
              {
                sx: {
                  minWidth: 0,
                  mr: open ? 2 : "0",
                  justifyContent: "center"
                },
                children: icon
              }
            ),
            open && /* @__PURE__ */ jsx(ListItemText, { primary: label })
          ]
        }
      )
    },
    label
  ));
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      Drawer,
      {
        variant: "permanent",
        PaperProps: {
          sx: {
            width: open ? OPEN : CLOSED,
            overflowX: "clip",
            // evita barra horizontal
            borderRadius: "0 8px 8px 0",
            boxShadow: "0 4px 24px rgba(0,0,0,.08)",
            transition: (t) => t.transitions.create("width", {
              duration: t.transitions.duration.shorter
            }),
            display: "flex",
            flexDirection: "column",
            ...sx
          }
        },
        children: [
          /* @__PURE__ */ jsxs(Stack, { position: "relative", alignItems: "center", spacing: 1, mt: 3, mb: 2, children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                component: "img",
                src: "https://placehold.co/40",
                width: 40,
                height: 40,
                borderRadius: "50%"
              }
            ),
            open && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Typography, { fontWeight: 700, fontSize: 14, children: "Alexandre Brissos" }),
              /* @__PURE__ */ jsx(Typography, { variant: "caption", color: "text.secondary", children: "TUTOR" }),
              /* @__PURE__ */ jsx(Divider, { sx: { width: "100%", mt: 1 } })
            ] })
          ] }),
          /* @__PURE__ */ jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(items) }),
          !!(footerItems == null ? void 0 : footerItems.length) && /* @__PURE__ */ jsx(Box, { mt: "auto", pb: 2, children: /* @__PURE__ */ jsx(List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(footerItems) }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      SidebarToggle,
      {
        open,
        openWidth: OPEN,
        closedWidth: CLOSED,
        vertical: toggleVertical,
        onToggle: toggle
      }
    )
  ] });
};
var NotificationBell = ({
  items,
  onSelect,
  onRemove,
  onClearAll,
  showZero = false,
  ...iconButtonProps
}) => {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  const unread = items.filter((i) => !i.lida).length;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Tooltip, { title: "Notifica\xE7\xF5es", children: /* @__PURE__ */ jsx(
      IconButton$1,
      {
        ...iconButtonProps,
        onClick: (e) => setAnchor(e.currentTarget),
        size: "large",
        children: /* @__PURE__ */ jsx(
          Badge,
          {
            color: "error",
            badgeContent: unread,
            invisible: !showZero && unread === 0,
            children: /* @__PURE__ */ jsx(NotificationsNoneIcon, {})
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsxs(
      Menu,
      {
        anchorEl: anchor,
        open,
        onClose: () => setAnchor(null),
        PaperProps: { sx: { width: 300, maxHeight: 360, p: 0 } },
        children: [
          /* @__PURE__ */ jsx(Box, { px: 2, py: 1.5, children: /* @__PURE__ */ jsx(Typography, { fontWeight: 600, children: "Notifica\xE7\xF5es" }) }),
          /* @__PURE__ */ jsx(Divider, {}),
          items.length === 0 ? /* @__PURE__ */ jsx(Box, { p: 3, textAlign: "center", children: /* @__PURE__ */ jsx(Typography, { variant: "body2", color: "text.secondary", children: "Sem notifica\xE7\xF5es." }) }) : /* @__PURE__ */ jsx(List, { dense: true, disablePadding: true, children: items.map((n) => /* @__PURE__ */ jsx(
            ListItem,
            {
              alignItems: "flex-start",
              secondaryAction: onRemove && /* @__PURE__ */ jsx(
                IconButton$1,
                {
                  edge: "end",
                  size: "small",
                  onClick: () => onRemove(n.id),
                  children: /* @__PURE__ */ jsx(DeleteOutlineIcon, { fontSize: "small" })
                }
              ),
              sx: {
                bgcolor: n.lida ? "background.paper" : "action.hover",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.selected" }
              },
              onClick: () => {
                onSelect == null ? void 0 : onSelect(n);
                setAnchor(null);
              },
              children: /* @__PURE__ */ jsx(
                ListItemText,
                {
                  primary: /* @__PURE__ */ jsx(
                    Typography,
                    {
                      variant: "body2",
                      fontWeight: n.lida ? 400 : 600,
                      children: n.titulo
                    }
                  ),
                  secondary: n.mensagem && /* @__PURE__ */ jsx(
                    Typography,
                    {
                      variant: "caption",
                      color: "text.secondary",
                      noWrap: true,
                      children: n.mensagem
                    }
                  )
                }
              )
            },
            n.id
          )) }),
          !!items.length && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(MenuItem, { onClick: () => onClearAll == null ? void 0 : onClearAll(), children: /* @__PURE__ */ jsx(Typography, { variant: "body2", textAlign: "center", width: "100%", children: "Limpar todas" }) })
          ] })
        ]
      }
    )
  ] });
};
var AvatarSelect = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholderAvatar,
  minWidth
}) => {
  const current = options.find((o) => o.id === value);
  const handle = (e) => onChange(e.target.value);
  const Placeholder = /* @__PURE__ */ jsxs(Box, { display: "flex", alignItems: "center", gap: 1, color: "text.secondary", children: [
    /* @__PURE__ */ jsx(Avatar, { sx: { width: 24, height: 24, bgcolor: "#E0E0E0" }, children: placeholderAvatar != null ? placeholderAvatar : /* @__PURE__ */ jsx(PersonOutlineIcon, { fontSize: "small" }) }),
    label
  ] });
  return /* @__PURE__ */ jsxs(
    FormControl,
    {
      fullWidth: true,
      variant: "standard",
      disabled,
      sx: { minWidth },
      children: [
        /* @__PURE__ */ jsx(InputLabel, { shrink: true, children: label }),
        /* @__PURE__ */ jsx(
          Select,
          {
            value,
            onChange: handle,
            renderValue: () => value && current ? /* @__PURE__ */ jsxs(Box, { display: "flex", alignItems: "center", gap: 1, children: [
              /* @__PURE__ */ jsx(Avatar, { src: current.avatar, sx: { width: 24, height: 24 }, children: current.nome[0] }),
              current.nome
            ] }) : Placeholder,
            children: options.map((o) => /* @__PURE__ */ jsx(MenuItem, { value: o.id, children: /* @__PURE__ */ jsxs(ListItem, { disableGutters: true, children: [
              /* @__PURE__ */ jsx(ListItemAvatar, { sx: { minWidth: 32 }, children: /* @__PURE__ */ jsx(Avatar, { src: o.avatar, sx: { width: 32, height: 32, marginRight: "1em" }, children: o.nome[0] }) }),
              /* @__PURE__ */ jsx(ListItemText, { primary: o.nome })
            ] }) }, o.id))
          }
        )
      ]
    }
  );
};
var QuizProgressBar = ({
  passo,
  total,
  mostrarTexto = true
}) => {
  const pct = useMemo(() => total > 0 ? passo / total * 100 : 0, [passo, total]);
  return /* @__PURE__ */ jsxs(Box, { children: [
    mostrarTexto && /* @__PURE__ */ jsxs(Typography, { variant: "caption", mb: 0.5, display: "block", children: [
      Math.round(pct),
      "% conclu\xEDdo"
    ] }),
    /* @__PURE__ */ jsx(
      LinearProgress,
      {
        variant: "determinate",
        value: pct,
        sx: {
          height: 8,
          borderRadius: 4,
          [`&.${linearProgressClasses.colorPrimary}`]: {
            bgcolor: "#E4E4E4"
          },
          [`& .${linearProgressClasses.bar}`]: {
            borderRadius: 4,
            /* animação suave */
            transition: "transform .4s ease-out",
            bgcolor: "primary.main"
          }
        }
      }
    )
  ] });
};
function ColumnFilterPopper({
  open,
  anchorEl,
  values,
  selected,
  onClose,
  onApply
}) {
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState(new Set(selected));
  useEffect(() => {
    if (open) setLocal(new Set(selected));
  }, [open, selected]);
  const list = useMemo(
    () => values.filter(
      (v) => String(v != null ? v : "").toLowerCase().includes(query.toLowerCase())
    ),
    [values, query]
  );
  const toggle = (v) => {
    const next = new Set(local);
    next.has(v) ? next.delete(v) : next.add(v);
    setLocal(next);
  };
  return /* @__PURE__ */ jsx(Popper, { open, anchorEl, placement: "bottom-start", children: /* @__PURE__ */ jsx(ClickAwayListener, { onClickAway: onClose, children: /* @__PURE__ */ jsxs(
    Box,
    {
      bgcolor: "#fff",
      borderRadius: 1,
      boxShadow: 3,
      p: 2,
      maxHeight: 300,
      overflow: "auto",
      minWidth: 220,
      children: [
        /* @__PURE__ */ jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", children: "Filtrar" }),
          /* @__PURE__ */ jsx(IconButton$1, { size: "small", onClick: () => setLocal(/* @__PURE__ */ new Set()), children: /* @__PURE__ */ jsx(ClearIcon, { fontSize: "inherit" }) })
        ] }),
        /* @__PURE__ */ jsx(
          TextField$1,
          {
            size: "small",
            placeholder: "Pesquisar\u2026",
            fullWidth: true,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            sx: { mb: 1 }
          }
        ),
        list.map((v) => /* @__PURE__ */ jsxs(MenuItem, { onClick: () => toggle(v), children: [
          /* @__PURE__ */ jsx(Checkbox, { size: "small", checked: local.has(v), sx: { mr: 1 } }),
          String(v != null ? v : "\u2014")
        ] }, String(v))),
        /* @__PURE__ */ jsx(Box, { textAlign: "right", mt: 1, children: /* @__PURE__ */ jsx(IconButton$1, { size: "small", color: "primary", onClick: () => (onApply(local), onClose()), children: /* @__PURE__ */ jsx(DoneIcon, { fontSize: "inherit" }) }) })
      ]
    }
  ) }) });
}
function SimpleDataTable({
  columns,
  rows,
  rowsPerPageOptions = [5, 10, 25],
  sx
}) {
  var _a;
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(rowsPerPageOptions[0]);
  const [filters, setFilters] = useState({});
  const [anchor, setAnchor] = useState(null);
  const [colFilter, setColFilter] = useState(null);
  const filteredRows = rows.filter(
    (r) => columns.every((c) => {
      var _a2;
      const active = filters[c.label];
      if (!(active == null ? void 0 : active.size)) return true;
      const val = c.field ? r[c.field] : (_a2 = c.render) == null ? void 0 : _a2.call(c, r);
      return active.has(val);
    })
  );
  const slice = filteredRows.slice(page * perPage, page * perPage + perPage);
  const openFilter = (el, col) => {
    setAnchor(el);
    setColFilter(col);
  };
  const colValues = colFilter ? [...new Set(rows.map((r) => colFilter.field ? r[colFilter.field] : colFilter.render(r)))] : [];
  return /* @__PURE__ */ jsxs(Paper, { sx: { width: "100%", overflow: "hidden", ...sx }, children: [
    /* @__PURE__ */ jsx(TableContainer, { children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHead, { children: /* @__PURE__ */ jsx(TableRow, { children: columns.map((c) => {
        var _a2;
        return /* @__PURE__ */ jsx(
          TableCell,
          {
            align: c.align,
            sx: { width: c.width, fontWeight: 700, ...c.sx },
            children: /* @__PURE__ */ jsxs(
              Stack,
              {
                direction: "row",
                spacing: 0.5,
                alignItems: "center",
                sx: { cursor: c.filterable ? "pointer" : "default" },
                onClick: c.filterable ? (e) => openFilter(e.currentTarget, c) : void 0,
                children: [
                  c.label,
                  c.filterable && /* @__PURE__ */ jsx(
                    FilterAltIcon,
                    {
                      fontSize: "small",
                      color: ((_a2 = filters[c.label]) == null ? void 0 : _a2.size) ? "primary" : "inherit"
                    }
                  )
                ]
              }
            )
          },
          c.label
        );
      }) }) }),
      /* @__PURE__ */ jsx(TableBody, { children: slice.map((row, i) => /* @__PURE__ */ jsx(TableRow, { children: columns.map((c) => /* @__PURE__ */ jsx(TableCell, { align: c.align, children: c.render ? c.render(row) : row[c.field] }, String(c.label))) }, i)) })
    ] }) }),
    /* @__PURE__ */ jsx(
      TablePagination,
      {
        component: "div",
        rowsPerPageOptions,
        count: filteredRows.length,
        rowsPerPage: perPage,
        page,
        onPageChange: (_, p) => setPage(p),
        onRowsPerPageChange: (e) => {
          setPerPage(parseInt(e.target.value, 10));
          setPage(0);
        },
        labelRowsPerPage: "Items por p\xE1gina:"
      }
    ),
    colFilter && /* @__PURE__ */ jsx(
      ColumnFilterPopper,
      {
        open: true,
        anchorEl: anchor,
        values: colValues,
        selected: (_a = filters[colFilter.label]) != null ? _a : /* @__PURE__ */ new Set(),
        onClose: () => setColFilter(null),
        onApply: (set) => setFilters({ ...filters, [colFilter.label]: set })
      }
    )
  ] });
}
var BookCard = ({
  variant = "view",
  title,
  coverImage,
  startDate,
  endDate,
  rating = 0,
  comment = "",
  onSave,
  onReserve
}) => {
  const theme2 = useTheme();
  const [currentCoverImage, setCurrentCoverImage] = useState(coverImage);
  useEffect(() => {
    setCurrentCoverImage(coverImage);
  }, [coverImage]);
  const [currentRating, setCurrentRating] = useState(rating);
  const [currentComment, setCurrentComment] = useState(comment);
  const handleSave = () => onSave == null ? void 0 : onSave(currentRating, currentComment, currentCoverImage);
  const handleReserve = () => onReserve == null ? void 0 : onReserve();
  return /* @__PURE__ */ jsxs(
    Card,
    {
      sx: {
        width: 300,
        borderRadius: 2,
        bgcolor: theme2.palette.secondary.light,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsx(
          CardMedia,
          {
            image: currentCoverImage,
            title,
            sx: {
              pt: "150%",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }
          }
        ),
        /* @__PURE__ */ jsxs(CardContent, { sx: { flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "h6", children: title }),
          variant === "view" && /* @__PURE__ */ jsxs(Fragment, { children: [
            startDate && endDate && /* @__PURE__ */ jsxs(Typography, { variant: "body2", children: [
              "In\xEDcio: ",
              startDate,
              " \u2014 Conclu\xEDdo: ",
              endDate
            ] }),
            /* @__PURE__ */ jsx(Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsx(Rating, { value: rating, readOnly: true, size: "small" }) }),
            comment && /* @__PURE__ */ jsxs(Typography, { variant: "body2", sx: { fontStyle: "italic" }, children: [
              "\u201C",
              comment,
              "\u201D"
            ] })
          ] }),
          variant === "edit" && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              TextField$1,
              {
                label: "URL da imagem da capa",
                type: "url",
                value: currentCoverImage,
                onChange: (e) => setCurrentCoverImage(e.target.value),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsx(Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsx(
              Rating,
              {
                value: currentRating,
                onChange: (_, v) => setCurrentRating(v != null ? v : 0)
              }
            ) }),
            /* @__PURE__ */ jsx(
              TextField$1,
              {
                label: "Coment\xE1rio",
                multiline: true,
                minRows: 3,
                value: currentComment,
                onChange: (e) => setCurrentComment(e.target.value),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsx(Box, { mt: "auto", textAlign: "center", children: /* @__PURE__ */ jsx(Button, { variant: "contained", color: "primary", onClick: handleSave, children: "Guardar avalia\xE7\xE3o" }) })
          ] }),
          variant === "reserve" && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsx(Rating, { value: rating, readOnly: true }) }),
            /* @__PURE__ */ jsx(Box, { mt: "auto", textAlign: "center", children: /* @__PURE__ */ jsx(Button, { variant: "contained", color: "primary", onClick: handleReserve, children: "Reservar" }) })
          ] })
        ] })
      ]
    }
  );
};
function useAgendaFeed(feedUrl) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!feedUrl) return;
    setLoading(true);
    fetch(feedUrl).then((res) => res.text()).then((xmlText) => {
      const dom = new window.DOMParser().parseFromString(xmlText, "text/xml");
      const rawItems = Array.from(dom.querySelectorAll("item"));
      const parsed = rawItems.map((itemEl) => {
        const obj = {};
        itemEl.childNodes.forEach((node) => {
          var _a, _b;
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node;
          const name = el.tagName;
          const text = (_b = (_a = el.textContent) == null ? void 0 : _a.trim()) != null ? _b : "";
          if (obj[name]) {
            if (Array.isArray(obj[name])) obj[name].push(text);
            else obj[name] = [obj[name], text];
          } else {
            obj[name] = text;
          }
        });
        let thumb;
        const enc = itemEl.querySelector("enclosure[url]");
        if (enc == null ? void 0 : enc.getAttribute("url")) {
          thumb = enc.getAttribute("url").trim();
        } else {
          const desc = obj["description"];
          if (desc) {
            const dd = new window.DOMParser().parseFromString(desc, "text/html");
            const img = dd.querySelector("img");
            if (img == null ? void 0 : img.src) thumb = img.src;
          }
        }
        return {
          title: obj["title"] || "",
          link: obj["link"] || "",
          description: obj["description"] || "",
          pubDate: obj["pubDate"] || "",
          author: obj["author"] || void 0,
          categories: obj["category"] ? Array.isArray(obj["category"]) ? obj["category"] : [obj["category"]] : [],
          thumbnailUrl: thumb,
          ...obj
        };
      });
      setItems(parsed);
    }).catch((err) => setError(err)).finally(() => setLoading(false));
  }, [feedUrl]);
  return { items, loading, error };
}
var AgendaFeed = ({
  feedUrl,
  columns = 2,
  imageRatio = "16/9",
  // usar aspectRatio moderno
  contentPadding = 2,
  cardMaxWidth = "360px",
  actions
}) => {
  const theme2 = useTheme();
  const { items, loading, error } = useAgendaFeed(feedUrl);
  if (loading) return /* @__PURE__ */ jsx(Typography, { children: "Carregando eventos\u2026" });
  if (error) return /* @__PURE__ */ jsxs(Typography, { color: "error", children: [
    "Erro: ",
    error.message
  ] });
  if (!(items == null ? void 0 : items.length)) return /* @__PURE__ */ jsx(Typography, { children: "Sem eventos." });
  const decodeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || "";
  };
  return /* @__PURE__ */ jsx(Grid, { container: true, spacing: 2, justifyContent: "center", children: items.map((item, i) => {
    var _a;
    const fullText = decodeHtml(item.description);
    const dataMatch = fullText.match(/Data:\s*([^|]+)/i);
    const localMatch = fullText.match(/Local:\s*([^|]+)/i);
    const resumo = fullText.split(/Data:/i)[0].trim();
    return /* @__PURE__ */ jsx(
      Grid,
      {
        item: true,
        xs: 12,
        sm: Math.floor(12 / columns),
        sx: { display: "flex", justifyContent: "center" },
        children: /* @__PURE__ */ jsxs(
          Paper,
          {
            elevation: 2,
            sx: {
              width: "100%",
              maxWidth: cardMaxWidth,
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: theme2.palette.background.paper
            },
            children: [
              item.thumbnailUrl && /* @__PURE__ */ jsx(
                CardMedia,
                {
                  component: "img",
                  image: item.thumbnailUrl,
                  alt: item.title,
                  sx: {
                    width: "100%",
                    aspectRatio: imageRatio,
                    objectFit: "cover"
                  }
                }
              ),
              /* @__PURE__ */ jsxs(Box, { sx: { p: contentPadding }, children: [
                /* @__PURE__ */ jsx(
                  Typography,
                  {
                    variant: "h6",
                    component: "h3",
                    gutterBottom: true,
                    sx: { fontWeight: 600 },
                    children: item.title
                  }
                ),
                dataMatch && /* @__PURE__ */ jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [
                  /* @__PURE__ */ jsx(AccessTimeIcon, { fontSize: "small", sx: { mr: 0.5, color: "text.secondary" } }),
                  /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: dataMatch[1].trim() })
                ] }),
                localMatch && /* @__PURE__ */ jsxs(Box, { display: "flex", alignItems: "center", mb: 1, children: [
                  /* @__PURE__ */ jsx(LocationOnIcon, { fontSize: "small", sx: { mr: 0.5, color: "text.secondary" } }),
                  /* @__PURE__ */ jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: localMatch[1].trim() })
                ] }),
                /* @__PURE__ */ jsx(Typography, { variant: "body2", sx: { mb: 2 }, children: resumo.length > 140 ? resumo.slice(0, 140) + "\u2026" : resumo }),
                /* @__PURE__ */ jsx(Box, { textAlign: "right", children: (_a = actions == null ? void 0 : actions(item)) != null ? _a : /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "contained",
                    size: "small",
                    href: item.link,
                    target: "_blank",
                    children: "Saber mais"
                  }
                ) })
              ] })
            ]
          }
        )
      },
      i
    );
  }) });
};
var AgendaLargeCard = ({
  title,
  pubDate,
  description,
  thumbnailUrl,
  link,
  width = "100%",
  imageRatio = "16/9",
  truncateLength = 200
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme2 = useTheme();
  const decodeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || "";
  };
  const fullText = decodeHtml(description);
  const displayText = expanded ? fullText : fullText.length > truncateLength ? fullText.slice(0, truncateLength) + "\u2026" : fullText;
  return /* @__PURE__ */ jsxs(
    Paper,
    {
      elevation: 4,
      sx: {
        width,
        borderRadius: 4,
        overflow: "hidden",
        mx: "auto"
      },
      children: [
        thumbnailUrl && /* @__PURE__ */ jsxs(Box, { position: "relative", children: [
          /* @__PURE__ */ jsx(
            CardMedia,
            {
              component: "img",
              image: thumbnailUrl,
              alt: title,
              sx: {
                width: "100%",
                aspectRatio: imageRatio,
                objectFit: "cover"
              }
            }
          ),
          /* @__PURE__ */ jsx(
            Box,
            {
              sx: {
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                bgcolor: "rgba(0,0,0,0.4)",
                color: "#fff",
                p: 2
              },
              children: /* @__PURE__ */ jsx(Typography, { variant: "h5", component: "h2", children: title })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Box, { sx: { p: 3, bgcolor: theme2.palette.background.paper }, children: [
          /* @__PURE__ */ jsx(Typography, { variant: "subtitle1", color: "text.secondary", gutterBottom: true, children: new Date(pubDate).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }) }),
          /* @__PURE__ */ jsx(Collapse, { in: true, sx: { mb: 2 }, children: /* @__PURE__ */ jsx(Typography, { variant: "body1", paragraph: true, children: displayText }) }),
          /* @__PURE__ */ jsxs(Box, { textAlign: "right", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "contained",
                onClick: () => setExpanded((e) => !e),
                sx: { mr: 1 },
                children: expanded ? "Ver menos" : "Saber mais"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outlined",
                href: link,
                target: "_blank",
                children: "Ir para p\xE1gina"
              }
            )
          ] })
        ] })
      ]
    }
  );
};
var FilterBar = ({
  filters,
  selected,
  onChange,
  icons = {},
  chipIcons = {}
}) => {
  const theme2 = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const openMenu = (e, filterId) => {
    setAnchorEl(e.currentTarget);
    setActiveFilter(filterId);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setActiveFilter(null);
  };
  const handleOptionClick = (value) => {
    if (!activeFilter) return;
    const curr = selected[activeFilter] || [];
    const next = curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value];
    onChange(activeFilter, next);
  };
  const handleDeleteChip = (filterId, value) => {
    const curr = selected[filterId] || [];
    onChange(filterId, curr.filter((v) => v !== value));
  };
  return /* @__PURE__ */ jsxs(Box, { children: [
    /* @__PURE__ */ jsx(Box, { display: "flex", gap: 1, mb: 1, children: filters.map((f) => /* @__PURE__ */ jsx(
      Button,
      {
        variant: "contained",
        size: "small",
        onClick: (e) => openMenu(e, f.id),
        startIcon: icons[f.id],
        endIcon: /* @__PURE__ */ jsx(ArrowDropDownIcon, {}),
        sx: {
          backgroundColor: theme2.palette.primary.main,
          "&:hover": { backgroundColor: theme2.palette.primary.dark }
        },
        children: f.label
      },
      f.id
    )) }),
    /* @__PURE__ */ jsx(Divider, { sx: { mb: 1 } }),
    /* @__PURE__ */ jsx(Box, { display: "flex", gap: 1, flexWrap: "wrap", mb: 1, children: Object.entries(selected).flatMap(
      ([filterId, vals]) => vals.map((val) => {
        var _a;
        const def = filters.find((f) => f.id === filterId);
        const label = ((_a = def.options.find((o) => o.value === val)) == null ? void 0 : _a.label) || val;
        const key = `${filterId}-${val}`;
        const chipIcon = chipIcons[filterId];
        return /* @__PURE__ */ jsx(
          Chip,
          {
            label,
            size: "small",
            onDelete: () => handleDeleteChip(filterId, val),
            deleteIcon: /* @__PURE__ */ jsx(CloseIcon, {}),
            icon: chipIcon,
            sx: {
              backgroundColor: theme2.palette.primary.light,
              color: theme2.palette.primary.contrastText
            }
          },
          key
        );
      })
    ) }),
    /* @__PURE__ */ jsx(
      Menu,
      {
        anchorEl,
        open: Boolean(anchorEl),
        onClose: closeMenu,
        children: activeFilter && filters.find((f) => f.id === activeFilter).options.map((opt) => {
          const isSelected = (selected[activeFilter] || []).includes(opt.value);
          return /* @__PURE__ */ jsxs(
            MenuItem,
            {
              selected: isSelected,
              onClick: () => handleOptionClick(opt.value),
              children: [
                opt.label,
                isSelected && /* @__PURE__ */ jsx(CloseIcon, { fontSize: "small", sx: { ml: 1 } })
              ]
            },
            opt.value
          );
        })
      }
    )
  ] });
};

export { AgendaFeed, AgendaLargeCard, AvatarListItem, AvatarSelect, AvatarUpload, BaseTextField, BibliotecarioThemeProvider, BookCard, EmailField, FilterBar, GradientBackground, HowItWorksSection, InfoStepCard_default as InfoStepCard, Logo, NotificationBell, NumericField, PasswordField, PrimaryButton, QuizProgressBar, RouteLink, SecondaryButton, SectionDivider, SelectableOptions, SidebarMenu, SimpleDataTable, WhiteCard, theme };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map