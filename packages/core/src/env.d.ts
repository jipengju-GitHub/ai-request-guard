/**
 * 全局编译时常量，由 rollup replace 插件注入。
 * - 开发构建：true（保留 mock、dev 警告等代码）
 * - 生产构建：false（相关分支被 tree-shake 掉）
 */
declare const __DEV__: boolean
