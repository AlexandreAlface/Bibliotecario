'use strict';

var material = require('@mui/material');
var styles = require('@mui/material/styles');
var jsxRuntime = require('react/jsx-runtime');
var system = require('@mui/system');
var react = require('react');
var TextField = require('@mui/material/TextField');
var InputAdornment = require('@mui/material/InputAdornment');
var IconButton = require('@mui/material/IconButton');
var Visibility = require('@mui/icons-material/Visibility');
var VisibilityOff = require('@mui/icons-material/VisibilityOff');
var PhotoCameraIcon = require('@mui/icons-material/PhotoCamera');
var EditIcon = require('@mui/icons-material/Edit');
var DeleteIcon = require('@mui/icons-material/Delete');
var ChevronLeftIcon = require('@mui/icons-material/ChevronLeft');
var ChevronRightIcon = require('@mui/icons-material/ChevronRight');
var NotificationsNoneIcon = require('@mui/icons-material/NotificationsNone');
var DeleteOutlineIcon = require('@mui/icons-material/DeleteOutline');
var PersonOutlineIcon = require('@mui/icons-material/PersonOutline');
var FilterAltIcon = require('@mui/icons-material/FilterAlt');
var ClearIcon = require('@mui/icons-material/Clear');
var DoneIcon = require('@mui/icons-material/Done');
var Grid = require('@mui/material/GridLegacy');
var AccessTimeIcon = require('@mui/icons-material/AccessTime');
var LocationOnIcon = require('@mui/icons-material/LocationOn');
var ArrowDropDownIcon = require('@mui/icons-material/ArrowDropDown');
var CloseIcon = require('@mui/icons-material/Close');
var SearchIcon = require('@mui/icons-material/Search');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var TextField__default = /*#__PURE__*/_interopDefault(TextField);
var InputAdornment__default = /*#__PURE__*/_interopDefault(InputAdornment);
var IconButton__default = /*#__PURE__*/_interopDefault(IconButton);
var Visibility__default = /*#__PURE__*/_interopDefault(Visibility);
var VisibilityOff__default = /*#__PURE__*/_interopDefault(VisibilityOff);
var PhotoCameraIcon__default = /*#__PURE__*/_interopDefault(PhotoCameraIcon);
var EditIcon__default = /*#__PURE__*/_interopDefault(EditIcon);
var DeleteIcon__default = /*#__PURE__*/_interopDefault(DeleteIcon);
var ChevronLeftIcon__default = /*#__PURE__*/_interopDefault(ChevronLeftIcon);
var ChevronRightIcon__default = /*#__PURE__*/_interopDefault(ChevronRightIcon);
var NotificationsNoneIcon__default = /*#__PURE__*/_interopDefault(NotificationsNoneIcon);
var DeleteOutlineIcon__default = /*#__PURE__*/_interopDefault(DeleteOutlineIcon);
var PersonOutlineIcon__default = /*#__PURE__*/_interopDefault(PersonOutlineIcon);
var FilterAltIcon__default = /*#__PURE__*/_interopDefault(FilterAltIcon);
var ClearIcon__default = /*#__PURE__*/_interopDefault(ClearIcon);
var DoneIcon__default = /*#__PURE__*/_interopDefault(DoneIcon);
var Grid__default = /*#__PURE__*/_interopDefault(Grid);
var AccessTimeIcon__default = /*#__PURE__*/_interopDefault(AccessTimeIcon);
var LocationOnIcon__default = /*#__PURE__*/_interopDefault(LocationOnIcon);
var ArrowDropDownIcon__default = /*#__PURE__*/_interopDefault(ArrowDropDownIcon);
var CloseIcon__default = /*#__PURE__*/_interopDefault(CloseIcon);
var SearchIcon__default = /*#__PURE__*/_interopDefault(SearchIcon);

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
var theme = styles.createTheme({
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.ThemeProvider, { theme, children: [
    /* @__PURE__ */ jsxRuntime.jsx(material.CssBaseline, {}),
    children
  ] });
}
var Styled = material.styled(material.Button, {
  // Impede que props customizadas vão parar ao DOM
  shouldForwardProp: (prop) => system.shouldForwardProp(prop) && prop !== "radius" && prop !== "px"
})(({ theme: theme2, radius = 4, px = 3 }) => ({
  borderRadius: theme2.spacing(radius),
  paddingInline: theme2.spacing(px),
  textTransform: "none",
  fontWeight: 600,
  boxShadow: "none",
  lineHeight: 1.5,
  "&:hover": {
    backgroundColor: material.alpha(theme2.palette.primary.main, 0.9),
    boxShadow: "none"
  },
  "&:disabled": {
    backgroundColor: theme2.palette.action.disabledBackground,
    color: theme2.palette.action.disabled
  },
  "&.Mui-focusVisible": {
    outline: `2px solid ${material.alpha(theme2.palette.primary.light, 0.8)}`,
    outlineOffset: 2
  }
}));
function PrimaryButton(props) {
  return /* @__PURE__ */ jsxRuntime.jsx(
    Styled,
    {
      variant: "contained",
      color: "primary",
      disableElevation: true,
      ...props
    }
  );
}
var Styled2 = material.styled(material.Button, {
  shouldForwardProp: (prop) => system.shouldForwardProp(prop) && prop !== "radius" && prop !== "px"
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
  return /* @__PURE__ */ jsxRuntime.jsx(Styled2, { variant: "outlined", ...props });
}
var EmailField = react.forwardRef(function EmailField2({ inputRef, ...props }, ref) {
  return /* @__PURE__ */ jsxRuntime.jsx(
    TextField__default.default,
    {
      ...props,
      type: "email",
      variant: "outlined",
      fullWidth: true,
      inputRef: ref != null ? ref : inputRef
    }
  );
});
var BaseTextField = system.styled(material.TextField, {
  shouldForwardProp: (prop) => system.shouldForwardProp(prop) && !["radius", "px", "py"].includes(prop)
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
  return /* @__PURE__ */ jsxRuntime.jsx(
    BaseTextField,
    {
      label: "N\xFAmero de telem\xF3vel",
      type: "tel",
      inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
      ...props
    }
  );
}
var PasswordField = react.forwardRef(function PasswordField2({ InputProps, ...rest }, ref) {
  const [show, setShow] = react.useState(false);
  return /* @__PURE__ */ jsxRuntime.jsx(
    TextField__default.default,
    {
      ...rest,
      type: show ? "text" : "password",
      variant: "outlined",
      fullWidth: true,
      inputRef: ref,
      InputProps: {
        ...InputProps,
        endAdornment: /* @__PURE__ */ jsxRuntime.jsx(InputAdornment__default.default, { position: "end", children: /* @__PURE__ */ jsxRuntime.jsx(IconButton__default.default, { onClick: () => setShow((s) => !s), edge: "end", "aria-label": "alternar visibilidade", children: show ? /* @__PURE__ */ jsxRuntime.jsx(VisibilityOff__default.default, {}) : /* @__PURE__ */ jsxRuntime.jsx(Visibility__default.default, {}) }) })
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
  return /* @__PURE__ */ jsxRuntime.jsx(
    material.Divider,
    {
      textAlign: "center",
      sx: {
        width,
        my: spacingY,
        borderBottomWidth: thickness,
        marginBottom: "0em",
        ...sx
      },
      children: /* @__PURE__ */ jsxRuntime.jsx(
        material.Typography,
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
var StyledLink = material.styled(material.Link, {
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
var RouteLink = react.forwardRef(
  function RouteLink2(props, ref) {
    return /* @__PURE__ */ jsxRuntime.jsx(StyledLink, { ref, ...props });
  }
);
var StyledCard = material.styled(material.Card, {
  shouldForwardProp: (prop) => system.shouldForwardProp(prop) && prop !== "width" && prop !== "height"
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
  return /* @__PURE__ */ jsxRuntime.jsx(StyledCard, { variant: "outlined", ...props });
}
var GradientBackground = styles.styled(material.Box, {
  shouldForwardProp: (prop) => prop !== "from" && prop !== "to" && prop !== "angle"
})(({ theme: theme2, from, to, angle = 135 }) => ({
  minHeight: "100vh",
  width: "100%",
  background: `linear-gradient(${angle}deg, ${from != null ? from : theme2.palette.secondary.main} 0%, ${to != null ? to : theme2.palette.primary.main} 100%)`,
  position: "relative",
  overflow: "hidden"
}));
var Circle = system.styled(material.Box, {
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { position: "relative", textAlign: "center", mt: 2, width: "100%", children: [
    /* @__PURE__ */ jsxRuntime.jsx(
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
    /* @__PURE__ */ jsxRuntime.jsxs(
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
          /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "h6", component: "h3", gutterBottom: true, children: title }),
          /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body2", sx: { whiteSpace: "pre-line" }, children: description })
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
  return /* @__PURE__ */ jsxRuntime.jsx(material.Box, { width: "100%", children: /* @__PURE__ */ jsxRuntime.jsx(
    material.Stack,
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
        return /* @__PURE__ */ jsxRuntime.jsx(
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
}) => /* @__PURE__ */ jsxRuntime.jsx(
  material.Box,
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.FormControl, { component: "fieldset", sx, children: [
    label && /* @__PURE__ */ jsxRuntime.jsx(material.FormLabel, { component: "legend", children: label }),
    isCheckbox ? /* @__PURE__ */ jsxRuntime.jsx(material.FormGroup, { row, children: options.map(({ value: v, label: l }) => /* @__PURE__ */ jsxRuntime.jsx(
      material.FormControlLabel,
      {
        control: /* @__PURE__ */ jsxRuntime.jsx(
          material.Checkbox,
          {
            checked: Array.isArray(value) && value.includes(v),
            onChange: handleChange(v)
          }
        ),
        label: l
      },
      v
    )) }) : /* @__PURE__ */ jsxRuntime.jsx(material.RadioGroup, { row, value, onChange: (_, val) => onChange(val), children: options.map(({ value: v, label: l }) => /* @__PURE__ */ jsxRuntime.jsx(
      material.FormControlLabel,
      {
        value: v,
        control: /* @__PURE__ */ jsxRuntime.jsx(material.Radio, {}),
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
  const inputRef = react.useRef(null);
  const [url, setUrl] = react.useState(value != null ? value : null);
  react.useEffect(() => {
    value !== void 0 && setUrl(value);
  }, [value]);
  react.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { position: "relative", width: size, height: size, sx, children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      material.Avatar,
      {
        src: url != null ? url : void 0,
        sx: { width: size, height: size, fontSize: size * 0.4 },
        children: placeholder != null ? placeholder : "\u2022"
      }
    ),
    showIcon && /* @__PURE__ */ jsxRuntime.jsx(
      material.IconButton,
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
        children: /* @__PURE__ */ jsxRuntime.jsx(PhotoCameraIcon__default.default, { fontSize: "small" })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
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
    { icon: /* @__PURE__ */ jsxRuntime.jsx(EditIcon__default.default, {}), tooltip: "Editar" },
    { icon: /* @__PURE__ */ jsxRuntime.jsx(DeleteIcon__default.default, {}), tooltip: "Remover" }
  ],
  avatarSize = 48,
  sx
}) => /* @__PURE__ */ jsxRuntime.jsxs(
  material.Box,
  {
    display: "flex",
    alignItems: "center",
    gap: 2,
    sx,
    children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        material.Avatar,
        {
          src: avatarSrc,
          sx: { width: avatarSize, height: avatarSize, flexShrink: 0 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body1", sx: { flexGrow: 1 }, children: label }),
      actions.map(
        ({ icon, tooltip, onClick, disabled }, idx) => tooltip ? /* @__PURE__ */ jsxRuntime.jsx(material.Tooltip, { title: tooltip, children: /* @__PURE__ */ jsxRuntime.jsx("span", { children: /* @__PURE__ */ jsxRuntime.jsx(
          material.IconButton,
          {
            onClick,
            disabled,
            size: "small",
            color: "inherit",
            children: icon
          }
        ) }) }, idx) : /* @__PURE__ */ jsxRuntime.jsx(
          material.IconButton,
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
var Handle = material.styled(material.IconButton)({
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
}) => /* @__PURE__ */ jsxRuntime.jsx(
  Handle,
  {
    onClick: onToggle,
    sx: {
      left: open ? openWidth : closedWidth,
      top: getTop(vertical)
    },
    children: open ? /* @__PURE__ */ jsxRuntime.jsx(ChevronLeftIcon__default.default, { fontSize: "small" }) : /* @__PURE__ */ jsxRuntime.jsx(ChevronRightIcon__default.default, { fontSize: "small" })
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
  sx,
  children,
  headerTitle,
  headerSubtitle,
  headerAvatarUrl
}) => {
  const [internal, setInternal] = react.useState(true);
  const open = controlled != null ? controlled : internal;
  const toggle = () => onToggle ? onToggle(!open) : setInternal(!open);
  const render = (arr) => arr.map(({ label, icon, selected, ...rest }) => /* @__PURE__ */ jsxRuntime.jsx(material.Tooltip, { title: !open ? label : "", placement: "right", arrow: true, disableInteractive: true, children: /* @__PURE__ */ jsxRuntime.jsxs(
    material.ListItemButton,
    {
      sx: { my: 0.5, borderRadius: 1, px: open ? 2 : 0, justifyContent: open ? "flex-start" : "center", ...selected && selectedSX },
      ...rest,
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(material.ListItemIcon, { sx: { minWidth: 0, mr: open ? 2 : 0, justifyContent: "center" }, children: icon }),
        open && /* @__PURE__ */ jsxRuntime.jsx(material.ListItemText, { primary: label })
      ]
    }
  ) }, label));
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      material.Drawer,
      {
        variant: "permanent",
        PaperProps: {
          sx: {
            width: open ? OPEN : CLOSED,
            overflowX: "clip",
            borderRadius: "0 8px 8px 0",
            boxShadow: "0 4px 24px rgba(0,0,0,.08)",
            bgcolor: "background.paper",
            backgroundImage: "none",
            transition: (t) => t.transitions.create("width", { duration: t.transitions.duration.shorter }),
            display: "flex",
            flexDirection: "column",
            ...sx
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs(material.Stack, { alignItems: "center", spacing: 1, mt: 3, mb: open ? 2 : 1, px: open ? 2 : 0, children: [
            /* @__PURE__ */ jsxRuntime.jsx(material.Avatar, { src: headerAvatarUrl, sx: { width: 40, height: 40 } }),
            open && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              !!headerTitle && /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { fontWeight: 700, fontSize: 14, textAlign: "center", children: headerTitle }),
              !!headerSubtitle && /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "caption", color: "text.secondary", children: headerSubtitle }),
              /* @__PURE__ */ jsxRuntime.jsx(material.Divider, { sx: { width: "100%", mt: 1 } })
            ] })
          ] }),
          open && children && /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { px: 2, pb: 1, children: [
            children,
            /* @__PURE__ */ jsxRuntime.jsx(material.Divider, { sx: { width: "100%", mt: 1 } })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(material.List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(items) }),
          !!(footerItems == null ? void 0 : footerItems.length) && /* @__PURE__ */ jsxRuntime.jsx(material.Box, { mt: "auto", pb: 2, children: /* @__PURE__ */ jsxRuntime.jsx(material.List, { disablePadding: true, sx: { px: open ? 1 : 0 }, children: render(footerItems) }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(SidebarToggle, { open, openWidth: OPEN, closedWidth: CLOSED, vertical: toggleVertical, onToggle: toggle })
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
  const [anchor, setAnchor] = react.useState(null);
  const open = Boolean(anchor);
  const unread = items.filter((i) => !i.lida).length;
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(material.Tooltip, { title: "Notifica\xE7\xF5es", children: /* @__PURE__ */ jsxRuntime.jsx(
      material.IconButton,
      {
        ...iconButtonProps,
        onClick: (e) => setAnchor(e.currentTarget),
        size: "large",
        children: /* @__PURE__ */ jsxRuntime.jsx(
          material.Badge,
          {
            color: "error",
            badgeContent: unread,
            invisible: !showZero && unread === 0,
            children: /* @__PURE__ */ jsxRuntime.jsx(NotificationsNoneIcon__default.default, {})
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      material.Menu,
      {
        anchorEl: anchor,
        open,
        onClose: () => setAnchor(null),
        PaperProps: { sx: { width: 300, maxHeight: 360, p: 0 } },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(material.Box, { px: 2, py: 1.5, children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { fontWeight: 600, children: "Notifica\xE7\xF5es" }) }),
          /* @__PURE__ */ jsxRuntime.jsx(material.Divider, {}),
          items.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx(material.Box, { p: 3, textAlign: "center", children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body2", color: "text.secondary", children: "Sem notifica\xE7\xF5es." }) }) : /* @__PURE__ */ jsxRuntime.jsx(material.List, { dense: true, disablePadding: true, children: items.map((n) => /* @__PURE__ */ jsxRuntime.jsx(
            material.ListItem,
            {
              alignItems: "flex-start",
              secondaryAction: onRemove && /* @__PURE__ */ jsxRuntime.jsx(
                material.IconButton,
                {
                  edge: "end",
                  size: "small",
                  onClick: () => onRemove(n.id),
                  children: /* @__PURE__ */ jsxRuntime.jsx(DeleteOutlineIcon__default.default, { fontSize: "small" })
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
              children: /* @__PURE__ */ jsxRuntime.jsx(
                material.ListItemText,
                {
                  primary: /* @__PURE__ */ jsxRuntime.jsx(
                    material.Typography,
                    {
                      variant: "body2",
                      fontWeight: n.lida ? 400 : 600,
                      children: n.titulo
                    }
                  ),
                  secondary: n.mensagem && /* @__PURE__ */ jsxRuntime.jsx(
                    material.Typography,
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
          !!items.length && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(material.Divider, {}),
            /* @__PURE__ */ jsxRuntime.jsx(material.MenuItem, { onClick: () => onClearAll == null ? void 0 : onClearAll(), children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body2", textAlign: "center", width: "100%", children: "Limpar todas" }) })
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
  const Placeholder = /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { display: "flex", alignItems: "center", gap: 1, color: "text.secondary", children: [
    /* @__PURE__ */ jsxRuntime.jsx(material.Avatar, { sx: { width: 24, height: 24, bgcolor: "#E0E0E0" }, children: placeholderAvatar != null ? placeholderAvatar : /* @__PURE__ */ jsxRuntime.jsx(PersonOutlineIcon__default.default, { fontSize: "small" }) }),
    label
  ] });
  return /* @__PURE__ */ jsxRuntime.jsxs(
    material.FormControl,
    {
      fullWidth: true,
      variant: "standard",
      disabled,
      sx: { minWidth },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(material.InputLabel, { shrink: true, children: label }),
        /* @__PURE__ */ jsxRuntime.jsx(
          material.Select,
          {
            value,
            onChange: handle,
            renderValue: () => value && current ? /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { display: "flex", alignItems: "center", gap: 1, children: [
              /* @__PURE__ */ jsxRuntime.jsx(material.Avatar, { src: current.avatar, sx: { width: 24, height: 24 }, children: current.nome[0] }),
              current.nome
            ] }) : Placeholder,
            children: options.map((o) => /* @__PURE__ */ jsxRuntime.jsx(material.MenuItem, { value: o.id, children: /* @__PURE__ */ jsxRuntime.jsxs(material.ListItem, { disableGutters: true, children: [
              /* @__PURE__ */ jsxRuntime.jsx(material.ListItemAvatar, { sx: { minWidth: 32 }, children: /* @__PURE__ */ jsxRuntime.jsx(material.Avatar, { src: o.avatar, sx: { width: 32, height: 32, marginRight: "1em" }, children: o.nome[0] }) }),
              /* @__PURE__ */ jsxRuntime.jsx(material.ListItemText, { primary: o.nome })
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
  const pct = react.useMemo(() => total > 0 ? passo / total * 100 : 0, [passo, total]);
  return /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { children: [
    mostrarTexto && /* @__PURE__ */ jsxRuntime.jsxs(material.Typography, { variant: "caption", mb: 0.5, display: "block", children: [
      Math.round(pct),
      "% conclu\xEDdo"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      material.LinearProgress,
      {
        variant: "determinate",
        value: pct,
        sx: {
          height: 8,
          borderRadius: 4,
          [`&.${material.linearProgressClasses.colorPrimary}`]: {
            bgcolor: "#E4E4E4"
          },
          [`& .${material.linearProgressClasses.bar}`]: {
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
  const [query, setQuery] = react.useState("");
  const [local, setLocal] = react.useState(new Set(selected));
  react.useEffect(() => {
    if (open) setLocal(new Set(selected));
  }, [open, selected]);
  const list = react.useMemo(
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
  return /* @__PURE__ */ jsxRuntime.jsx(material.Popper, { open, anchorEl, placement: "bottom-start", children: /* @__PURE__ */ jsxRuntime.jsx(material.ClickAwayListener, { onClickAway: onClose, children: /* @__PURE__ */ jsxRuntime.jsxs(
    material.Box,
    {
      bgcolor: "#fff",
      borderRadius: 1,
      boxShadow: 3,
      p: 2,
      maxHeight: 300,
      overflow: "auto",
      minWidth: 220,
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs(material.Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1, children: [
          /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "subtitle2", children: "Filtrar" }),
          /* @__PURE__ */ jsxRuntime.jsx(material.IconButton, { size: "small", onClick: () => setLocal(/* @__PURE__ */ new Set()), children: /* @__PURE__ */ jsxRuntime.jsx(ClearIcon__default.default, { fontSize: "inherit" }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          material.TextField,
          {
            size: "small",
            placeholder: "Pesquisar\u2026",
            fullWidth: true,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            sx: { mb: 1 }
          }
        ),
        list.map((v) => /* @__PURE__ */ jsxRuntime.jsxs(material.MenuItem, { onClick: () => toggle(v), children: [
          /* @__PURE__ */ jsxRuntime.jsx(material.Checkbox, { size: "small", checked: local.has(v), sx: { mr: 1 } }),
          String(v != null ? v : "\u2014")
        ] }, String(v))),
        /* @__PURE__ */ jsxRuntime.jsx(material.Box, { textAlign: "right", mt: 1, children: /* @__PURE__ */ jsxRuntime.jsx(material.IconButton, { size: "small", color: "primary", onClick: () => (onApply(local), onClose()), children: /* @__PURE__ */ jsxRuntime.jsx(DoneIcon__default.default, { fontSize: "inherit" }) }) })
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
  const [page, setPage] = react.useState(0);
  const [perPage, setPerPage] = react.useState(rowsPerPageOptions[0]);
  const [filters, setFilters] = react.useState({});
  const [anchor, setAnchor] = react.useState(null);
  const [colFilter, setColFilter] = react.useState(null);
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.Paper, { sx: { width: "100%", overflow: "hidden", ...sx }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(material.TableContainer, { children: /* @__PURE__ */ jsxRuntime.jsxs(material.Table, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(material.TableHead, { children: /* @__PURE__ */ jsxRuntime.jsx(material.TableRow, { children: columns.map((c) => {
        var _a2;
        return /* @__PURE__ */ jsxRuntime.jsx(
          material.TableCell,
          {
            align: c.align,
            sx: { width: c.width, fontWeight: 700, ...c.sx },
            children: /* @__PURE__ */ jsxRuntime.jsxs(
              material.Stack,
              {
                direction: "row",
                spacing: 0.5,
                alignItems: "center",
                sx: { cursor: c.filterable ? "pointer" : "default" },
                onClick: c.filterable ? (e) => openFilter(e.currentTarget, c) : void 0,
                children: [
                  c.label,
                  c.filterable && /* @__PURE__ */ jsxRuntime.jsx(
                    FilterAltIcon__default.default,
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
      /* @__PURE__ */ jsxRuntime.jsx(material.TableBody, { children: slice.map((row, i) => /* @__PURE__ */ jsxRuntime.jsx(material.TableRow, { children: columns.map((c) => /* @__PURE__ */ jsxRuntime.jsx(material.TableCell, { align: c.align, children: c.render ? c.render(row) : row[c.field] }, String(c.label))) }, i)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      material.TablePagination,
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
    colFilter && /* @__PURE__ */ jsxRuntime.jsx(
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
  const theme2 = material.useTheme();
  const [currentCoverImage, setCurrentCoverImage] = react.useState(coverImage);
  react.useEffect(() => {
    setCurrentCoverImage(coverImage);
  }, [coverImage]);
  const [currentRating, setCurrentRating] = react.useState(rating);
  const [currentComment, setCurrentComment] = react.useState(comment);
  const handleSave = () => onSave == null ? void 0 : onSave(currentRating, currentComment, currentCoverImage);
  const handleReserve = () => onReserve == null ? void 0 : onReserve();
  return /* @__PURE__ */ jsxRuntime.jsxs(
    material.Card,
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
        /* @__PURE__ */ jsxRuntime.jsx(
          material.CardMedia,
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
        /* @__PURE__ */ jsxRuntime.jsxs(material.CardContent, { sx: { flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "h6", children: title }),
          variant === "view" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            startDate && endDate && /* @__PURE__ */ jsxRuntime.jsxs(material.Typography, { variant: "body2", children: [
              "In\xEDcio: ",
              startDate,
              " \u2014 Conclu\xEDdo: ",
              endDate
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(material.Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsxRuntime.jsx(material.Rating, { value: rating, readOnly: true, size: "small" }) }),
            comment && /* @__PURE__ */ jsxRuntime.jsxs(material.Typography, { variant: "body2", sx: { fontStyle: "italic" }, children: [
              "\u201C",
              comment,
              "\u201D"
            ] })
          ] }),
          variant === "edit" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              material.TextField,
              {
                label: "URL da imagem da capa",
                type: "url",
                value: currentCoverImage,
                onChange: (e) => setCurrentCoverImage(e.target.value),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(material.Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsxRuntime.jsx(
              material.Rating,
              {
                value: currentRating,
                onChange: (_, v) => setCurrentRating(v != null ? v : 0)
              }
            ) }),
            /* @__PURE__ */ jsxRuntime.jsx(
              material.TextField,
              {
                label: "Coment\xE1rio",
                multiline: true,
                minRows: 3,
                value: currentComment,
                onChange: (e) => setCurrentComment(e.target.value),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(material.Box, { mt: "auto", textAlign: "center", children: /* @__PURE__ */ jsxRuntime.jsx(material.Button, { variant: "contained", color: "primary", onClick: handleSave, children: "Guardar avalia\xE7\xE3o" }) })
          ] }),
          variant === "reserve" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(material.Box, { display: "flex", alignItems: "center", children: /* @__PURE__ */ jsxRuntime.jsx(material.Rating, { value: rating, readOnly: true }) }),
            /* @__PURE__ */ jsxRuntime.jsx(material.Box, { mt: "auto", textAlign: "center", children: /* @__PURE__ */ jsxRuntime.jsx(material.Button, { variant: "contained", color: "primary", onClick: handleReserve, children: "Reservar" }) })
          ] })
        ] })
      ]
    }
  );
};
function useAgendaFeed(feedUrl) {
  const [items, setItems] = react.useState(null);
  const [loading, setLoading] = react.useState(true);
  const [error, setError] = react.useState(null);
  react.useEffect(() => {
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
  const theme2 = material.useTheme();
  const { items, loading, error } = useAgendaFeed(feedUrl);
  if (loading) return /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { children: "Carregando eventos\u2026" });
  if (error) return /* @__PURE__ */ jsxRuntime.jsxs(material.Typography, { color: "error", children: [
    "Erro: ",
    error.message
  ] });
  if (!(items == null ? void 0 : items.length)) return /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { children: "Sem eventos." });
  const decodeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || "";
  };
  return /* @__PURE__ */ jsxRuntime.jsx(Grid__default.default, { container: true, spacing: 2, justifyContent: "center", children: items.map((item, i) => {
    var _a;
    const fullText = decodeHtml(item.description);
    const dataMatch = fullText.match(/Data:\s*([^|]+)/i);
    const localMatch = fullText.match(/Local:\s*([^|]+)/i);
    const resumo = fullText.split(/Data:/i)[0].trim();
    return /* @__PURE__ */ jsxRuntime.jsx(
      Grid__default.default,
      {
        item: true,
        xs: 12,
        sm: Math.floor(12 / columns),
        sx: { display: "flex", justifyContent: "center" },
        children: /* @__PURE__ */ jsxRuntime.jsxs(
          material.Paper,
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
              item.thumbnailUrl && /* @__PURE__ */ jsxRuntime.jsx(
                material.CardMedia,
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
              /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { sx: { p: contentPadding }, children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  material.Typography,
                  {
                    variant: "h6",
                    component: "h3",
                    gutterBottom: true,
                    sx: { fontWeight: 600 },
                    children: item.title
                  }
                ),
                dataMatch && /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { display: "flex", alignItems: "center", mb: 1, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(AccessTimeIcon__default.default, { fontSize: "small", sx: { mr: 0.5, color: "text.secondary" } }),
                  /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "subtitle2", color: "text.secondary", children: dataMatch[1].trim() })
                ] }),
                localMatch && /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { display: "flex", alignItems: "center", mb: 1, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(LocationOnIcon__default.default, { fontSize: "small", sx: { mr: 0.5, color: "text.secondary" } }),
                  /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "subtitle2", color: "text.secondary", children: localMatch[1].trim() })
                ] }),
                /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body2", sx: { mb: 2 }, children: resumo.length > 140 ? resumo.slice(0, 140) + "\u2026" : resumo }),
                /* @__PURE__ */ jsxRuntime.jsx(material.Box, { textAlign: "right", children: (_a = actions == null ? void 0 : actions(item)) != null ? _a : /* @__PURE__ */ jsxRuntime.jsx(
                  material.Button,
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
  const [expanded, setExpanded] = react.useState(false);
  const theme2 = material.useTheme();
  const decodeHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || "";
  };
  const fullText = decodeHtml(description);
  const displayText = expanded ? fullText : fullText.length > truncateLength ? fullText.slice(0, truncateLength) + "\u2026" : fullText;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    material.Paper,
    {
      elevation: 4,
      sx: {
        width,
        borderRadius: 4,
        overflow: "hidden",
        mx: "auto"
      },
      children: [
        thumbnailUrl && /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { position: "relative", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            material.CardMedia,
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
          /* @__PURE__ */ jsxRuntime.jsx(
            material.Box,
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
              children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "h5", component: "h2", children: title })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { sx: { p: 3, bgcolor: theme2.palette.background.paper }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "subtitle1", color: "text.secondary", gutterBottom: true, children: new Date(pubDate).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }) }),
          /* @__PURE__ */ jsxRuntime.jsx(material.Collapse, { in: true, sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "body1", paragraph: true, children: displayText }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { textAlign: "right", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              material.Button,
              {
                variant: "contained",
                onClick: () => setExpanded((e) => !e),
                sx: { mr: 1 },
                children: expanded ? "Ver menos" : "Saber mais"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(
              material.Button,
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
  const theme2 = material.useTheme();
  const [anchorEl, setAnchorEl] = react.useState(null);
  const [activeFilter, setActiveFilter] = react.useState(null);
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
  return /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(material.Box, { display: "flex", gap: 1, mb: 1, children: filters.map((f) => /* @__PURE__ */ jsxRuntime.jsx(
      material.Button,
      {
        variant: "contained",
        size: "small",
        onClick: (e) => openMenu(e, f.id),
        startIcon: icons[f.id],
        endIcon: /* @__PURE__ */ jsxRuntime.jsx(ArrowDropDownIcon__default.default, {}),
        sx: {
          backgroundColor: theme2.palette.primary.main,
          "&:hover": { backgroundColor: theme2.palette.primary.dark }
        },
        children: f.label
      },
      f.id
    )) }),
    /* @__PURE__ */ jsxRuntime.jsx(material.Divider, { sx: { mb: 1 } }),
    /* @__PURE__ */ jsxRuntime.jsx(material.Box, { display: "flex", gap: 1, flexWrap: "wrap", mb: 1, children: Object.entries(selected).flatMap(
      ([filterId, vals]) => vals.map((val) => {
        var _a;
        const def = filters.find((f) => f.id === filterId);
        const label = ((_a = def.options.find((o) => o.value === val)) == null ? void 0 : _a.label) || val;
        const key = `${filterId}-${val}`;
        const chipIcon = chipIcons[filterId];
        return /* @__PURE__ */ jsxRuntime.jsx(
          material.Chip,
          {
            label,
            size: "small",
            onDelete: () => handleDeleteChip(filterId, val),
            deleteIcon: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon__default.default, {}),
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
    /* @__PURE__ */ jsxRuntime.jsx(
      material.Menu,
      {
        anchorEl,
        open: Boolean(anchorEl),
        onClose: closeMenu,
        children: activeFilter && filters.find((f) => f.id === activeFilter).options.map((opt) => {
          const isSelected = (selected[activeFilter] || []).includes(opt.value);
          return /* @__PURE__ */ jsxRuntime.jsxs(
            material.MenuItem,
            {
              selected: isSelected,
              onClick: () => handleOptionClick(opt.value),
              children: [
                opt.label,
                isSelected && /* @__PURE__ */ jsxRuntime.jsx(CloseIcon__default.default, { fontSize: "small", sx: { ml: 1 } })
              ]
            },
            opt.value
          );
        })
      }
    )
  ] });
};
var Paginator = ({
  count,
  page,
  onChange,
  siblingCount = 1,
  boundaryCount = 1,
  showFirstButton = false,
  showLastButton = false,
  muiProps = {}
}) => /* @__PURE__ */ jsxRuntime.jsx(material.Stack, { alignItems: "center", sx: { my: 2 }, children: /* @__PURE__ */ jsxRuntime.jsx(
  material.Pagination,
  {
    count,
    page,
    onChange,
    siblingCount,
    boundaryCount,
    showFirstButton,
    showLastButton,
    color: "primary",
    ...muiProps
  }
) });
var QuizQuestion = ({
  pergunta,
  opcoes,
  valor,
  onChange,
  topoIcon,
  sx
}) => /* @__PURE__ */ jsxRuntime.jsxs(material.Box, { textAlign: "center", sx, children: [
  /* @__PURE__ */ jsxRuntime.jsx(
    material.Box,
    {
      position: "relative",
      bgcolor: "rgba(122,68,189,0.08)",
      color: "primary.dark",
      px: 4,
      py: 3,
      borderRadius: 2,
      mb: 4,
      children: /* @__PURE__ */ jsxRuntime.jsx(material.Typography, { variant: "h6", fontWeight: 600, children: pergunta })
    }
  ),
  /* @__PURE__ */ jsxRuntime.jsx(Grid__default.default, { container: true, spacing: 4, justifyContent: "center", children: opcoes.map((o) => {
    const selected = o.value === valor;
    return /* @__PURE__ */ jsxRuntime.jsx(Grid__default.default, { item: true, children: /* @__PURE__ */ jsxRuntime.jsx(
      material.Card,
      {
        elevation: 0,
        sx: {
          width: 120,
          height: 120,
          borderRadius: 2,
          bgcolor: selected ? "primary.main" : "rgba(122,68,189,0.08)",
          color: selected ? "#fff" : "primary.dark",
          transition: "all .25s"
        },
        children: /* @__PURE__ */ jsxRuntime.jsx(
          material.CardActionArea,
          {
            sx: {
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 2
            },
            onClick: () => onChange == null ? void 0 : onChange(o.value),
            children: /* @__PURE__ */ jsxRuntime.jsx(
              material.Typography,
              {
                variant: "h6",
                fontWeight: 600,
                textAlign: "center",
                sx: { userSelect: "none" },
                children: o.label
              }
            )
          }
        )
      }
    ) }, o.value);
  }) })
] });
var SearchBar = ({
  value,
  onChange,
  onSearch,
  placeholder = "Pesquisar\u2026",
  textFieldProps
}) => {
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(value);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsx(
    material.TextField,
    {
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      onKeyPress: handleKeyPress,
      variant: "outlined",
      size: "small",
      fullWidth: true,
      InputProps: {
        startAdornment: /* @__PURE__ */ jsxRuntime.jsx(material.InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntime.jsx(
          material.IconButton,
          {
            size: "small",
            onClick: () => onSearch == null ? void 0 : onSearch(value),
            edge: "start",
            children: /* @__PURE__ */ jsxRuntime.jsx(SearchIcon__default.default, { fontSize: "small" })
          }
        ) }),
        endAdornment: value ? /* @__PURE__ */ jsxRuntime.jsx(material.InputAdornment, { position: "end", children: /* @__PURE__ */ jsxRuntime.jsx(
          material.IconButton,
          {
            size: "small",
            onClick: () => onChange(""),
            edge: "end",
            children: /* @__PURE__ */ jsxRuntime.jsx(ClearIcon__default.default, { fontSize: "small" })
          }
        ) }) : null
      },
      ...textFieldProps
    }
  );
};

exports.AgendaFeed = AgendaFeed;
exports.AgendaLargeCard = AgendaLargeCard;
exports.AvatarListItem = AvatarListItem;
exports.AvatarSelect = AvatarSelect;
exports.AvatarUpload = AvatarUpload;
exports.BaseTextField = BaseTextField;
exports.BibliotecarioThemeProvider = BibliotecarioThemeProvider;
exports.BookCard = BookCard;
exports.EmailField = EmailField;
exports.FilterBar = FilterBar;
exports.GradientBackground = GradientBackground;
exports.HowItWorksSection = HowItWorksSection;
exports.InfoStepCard = InfoStepCard_default;
exports.Logo = Logo;
exports.NotificationBell = NotificationBell;
exports.NumericField = NumericField;
exports.Paginator = Paginator;
exports.PasswordField = PasswordField;
exports.PrimaryButton = PrimaryButton;
exports.QuizProgressBar = QuizProgressBar;
exports.QuizQuestion = QuizQuestion;
exports.RouteLink = RouteLink;
exports.SearchBar = SearchBar;
exports.SecondaryButton = SecondaryButton;
exports.SectionDivider = SectionDivider;
exports.SelectableOptions = SelectableOptions;
exports.SidebarMenu = SidebarMenu;
exports.SimpleDataTable = SimpleDataTable;
exports.WhiteCard = WhiteCard;
exports.theme = theme;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map