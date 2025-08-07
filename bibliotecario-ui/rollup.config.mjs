// rollup.config.mjs
import peer          from 'rollup-plugin-peer-deps-external';
import ts            from '@rollup/plugin-typescript';
import dts           from 'rollup-plugin-dts';
import postcss       from 'rollup-plugin-postcss';
import postcssImport from 'postcss-import';
import url           from '@rollup/plugin-url';

/* ────────────────────────── */
/* plugin “ignora estáticos”  */
/* ────────────────────────── */
const ignoreStatic = () => ({
  name: 'ignore-static',
  resolveId(id) {
    if (/\.(css|scss|png|jpe?g|gif|svg|webp)$/i.test(id)) return id;
  },
  load(id) {
    if (/\.(css|scss|png|jpe?g|gif|svg|webp)$/i.test(id)) return 'export default ""';
  },
});

export default [
  /* 1) bundle JS */
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'esm', sourcemap: true },
    external: [
      'react','react-dom',
      '@mui/system','@mui/material','@mui/icons-material',
      '@emotion/react','@emotion/styled',
      /^@fontsource\/poppins\/.+\.css$/,
    ],
    plugins: [
      peer(),
      // transforma imports de PNG/JPG/SVG em URLs e copia para dist/assets
      url({
        include: ['**/*.{png,jpg,jpeg,gif,svg,webp}'],
        limit: 0,                                   // 0 = nunca inline
        fileName: 'assets/[name]-[hash][extname]',  // saída: dist/assets/...
      }),
      ts({ tsconfig: './tsconfig.json' }),
      postcss({
        inject: true,
        minimize: true,
        modules: { generateScopedName: '[local]__[hash:base64:5]' },
        extensions: ['.css', '.scss'],
        use: ['sass'],
        plugins: [postcssImport()],
      }),
    ],
  },

  /* 2) bundle só das declarações (.d.ts) */
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [
      ignoreStatic(),   // precisa vir antes do dts()
      dts(),
    ],
  },
];
