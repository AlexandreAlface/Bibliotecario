import peer from 'rollup-plugin-peer-deps-external'
import ts from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true }
    ],
    plugins: [peer(), ts({ tsconfig: './tsconfig.json' })]
  },
  {
    input: 'dist/types/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()]
  }
]
