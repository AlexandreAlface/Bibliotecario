import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],         // tens src/index.ts
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    ...Object.keys((pkg as any).peerDependencies || {}),
    '@mui/icons-material',
    '@mui/icons-material/*',
    '@fontsource/poppins/*'
  ]
});
