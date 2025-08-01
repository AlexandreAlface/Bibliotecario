
import { BibliotecarioThemeProvider } from '../../src/ThemeProvider';

import type { Decorator } from '@storybook/react';

export const withTheme: Decorator = (Story) => (
  <BibliotecarioThemeProvider>
    <Story />
  </BibliotecarioThemeProvider>
);