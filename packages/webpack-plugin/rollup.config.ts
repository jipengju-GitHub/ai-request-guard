import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import dts from 'rollup-plugin-dts'
import { defineConfig } from 'rollup'

export default defineConfig([
  {
    input: 'src/index.ts',
    external: ['fs', 'path', 'vm', 'http', 'https', 'net'],
    output: [
      { file: 'dist/index.js', format: 'esm', exports: 'named' },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named' },
    ],
    plugins: [
      replace({ preventAssignment: true, values: { __DEV__: 'false' } }),
      typescript({ tsconfig: './tsconfig.json', sourceMap: false, declaration: false, declarationMap: false, include: ['src/**/*', '../ai/src/**/*', '../core/src/**/*'] }),
    ],
  },
  {
    input: 'src/report-sink.ts',
    external: ['@ai-request-guard/core'],
    output: [
      { file: 'dist/report-sink.js', format: 'esm' },
      { file: 'dist/report-sink.cjs', format: 'cjs' },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json', sourceMap: false, declaration: false, declarationMap: false })],
  },
  {
    input: 'src/index.ts',
    external: ['fs', 'path', 'vm', 'http', 'https', 'net'],
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
])
