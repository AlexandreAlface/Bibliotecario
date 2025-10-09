// apps/mobile/src/theme.ts
import type { MD3Theme } from 'react-native-paper';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

/** WEB (MUI) → base
 * primary.main:   #05a79e (teal)   | contrastText: #ffffff
 * secondary.main: #f6941f (orange) | contrastText: #ffffff
 * background: { default: #fafafa, paper: #ffffff }
 * (sec. complement sugerida: #fab041)
 */

export const LightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    /* === Brand === */
    primary: '#05a79e',
    onPrimary: '#ffffff',

    secondary: '#f6941f',
    onSecondary: '#ffffff',

    // usamos o “secondaryComplement” como tertiary para realces (chips/badges)
    tertiary: '#fab041',
    onTertiary: '#100f0d',

    /* === Surfaces & Background === */
    background: '#fafafa',    // MUI background.default
    onBackground: '#101113',

    surface: '#ffffff',       // MUI background.paper
    onSurface: '#101113',

    surfaceVariant: '#EFF1F5',
    onSurfaceVariant: '#41454F',

    /* === Outlines === */
    outline: '#D9DDE5',       // ligeiro ajuste do teu #D5D9E2
    outlineVariant: '#ECEFF5',// próximo do #E6E9F0

    /* === Status === */
    error: '#E53935',
    onError: '#ffffff',
  },
};

export const DarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,

    /* No dark, subimos a luminosidade/saturação para bom contraste */
    primary: '#24c9bf',       // teal mais claro para dark, “parecido” ao #05a79e
    onPrimary: '#001314',

    secondary: '#ffa951',     // laranja um pouco mais claro
    onSecondary: '#0B0C10',

    tertiary: '#ffc061',      // complemento mais claro
    onTertiary: '#0B0C10',

    background: '#0B0C10',
    onBackground: '#E8EAEE',

    surface: '#12141A',
    onSurface: '#E8EAEE',

    surfaceVariant: '#1B1E26',
    onSurfaceVariant: '#C6CBD7',

    outline: '#323643',
    outlineVariant: '#242936',

    error: '#FF6B6B',
    onError: '#0B0C10',
  },
};
