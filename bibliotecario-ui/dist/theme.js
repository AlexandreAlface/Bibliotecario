import { createTheme } from '@mui/material/styles';

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

export { theme };
//# sourceMappingURL=theme.js.map
