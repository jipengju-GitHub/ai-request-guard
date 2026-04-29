import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import { defineConfig } from 'rollup'

const external = ['fs', 'path', '@ai-request-guard/core']

export default defineConfig([
  // Node plugin (CJS + ESM)
  {
    input: 'src/index.ts',
    external,
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json', sourceMap: true })],
  },
  // Browser report-sink (ESM only — bundled into user's app by webpack)
  {
    input: 'src/report-sink.ts',
    external,
    output: { file: 'dist/report-sink.js', format: 'esm', sourcemap: true },
    plugins: [typescript({ tsconfig: './tsconfig.json', sourceMap: true })],
  },
  // Type declarations
  {
    input: 'src/index.ts',
    external,
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
  {
    input: 'src/report-sink.ts',
    external,
    output: { file: 'dist/report-sink.d.ts', format: 'esm' },
    plugins: [dts()],
  },
])
