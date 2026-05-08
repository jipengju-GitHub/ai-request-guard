import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import { defineConfig } from 'rollup'

const external = ['vite', 'fs', 'path', 'vm', 'http', 'net', '@ai-request-guard/core']

export default defineConfig([
  {
    input: 'src/index.ts',
    external,
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json', sourceMap: true, declaration: false, declarationMap: false, include: ['src/**/*', '../ai/src/**/*', '../core/src/**/*'] })],
  },
  {
    input: 'src/index.ts',
    external,
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
])
