import { createTheme } from '@mui/material/styles';


const palette = {
  primary:{ main: '#05a79e', contrastText: '#ffffff' }, // verde
  secondary:  { main: '#f6941f', contrastText: '#ffffff' }, // roxo
  // secondaryComplement:  { main: '#fab041', contrastText: '#ffffff' }, // roxo
  background: {
    default: '#fafafa',
    paper:   '#ffffff',
  },
};


export type SizeProps = {
  radius?: number; // unidades de spacing do tema
  px?: number;     // padding horizontal em spacing
};

export const theme = createTheme({
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
