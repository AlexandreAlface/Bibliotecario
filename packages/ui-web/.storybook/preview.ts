import type { Preview } from '@storybook/react';
import { withTheme } from './decorators/theme';


export const decorators = [withTheme];

const preview: Preview = {};
export default preview;