import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import React, { PropsWithChildren } from 'react';

/**
 * BibliotecarioThemeProvider is a custom theme provider that applies the MUI theme
 * and CssBaseline to the application.
 *
 * @param {PropsWithChildren} props - The props containing children components.
 * @returns {JSX.Element} The ThemeProvider with the applied theme and CssBaseline.
 */
export function BibliotecarioThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
