import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import dts from 'rollup-plugin-dts'
import { defineConfig } from 'rollup'

/**
 * __DEV__ 替换规则：
 * - dev 构建（默认）：true，mock 代码保留，开启 schema 校验和 diff 提示
 * - prod 构建：false，mock 分支成为 dead code，被 tree-shake 掉
 */
const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig([
  // 主构建：ESM + CJS + UMD
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'AIRequestGuard',
        sourcemap: true,
        exports: 'named',
      },
    ],
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          __DEV__: JSON.stringify(isDev),
        },
      }),
      typescript({ tsconfig: './tsconfig.json', sourceMap: true }),
    ],
  },
  // 类型声明文件
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
])
