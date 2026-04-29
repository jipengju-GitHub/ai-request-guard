import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import { defineConfig } from 'rollup'

export default defineConfig([
  {
    input: 'src/index.ts',
    external: ['vite', 'fs', 'path', '@ai-request-guard/core'],
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json', sourceMap: true })],
  },
  {
    input: 'src/index.ts',
    external: ['vite', 'fs', 'path', '@ai-request-guard/core'],
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
])
