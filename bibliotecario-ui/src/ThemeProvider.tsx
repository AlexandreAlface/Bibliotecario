import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

export function BibliotecarioThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
