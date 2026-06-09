/**
 * @ai-request-guard/core 公共入口。
 *
 * 默认导出 AIRequestGuard 主函数，同时具名导出各子模块供按需引用。
 *
 * 典型用法（JS）：
 * ```js
 * import AIRequestGuard from '@ai-request-guard/core'
 *
 * const getUserAdapter = (raw) => ({ id: raw.user_id })
 * AIRequestGuard.register({ adapter: getUserAdapter })
 *
 * const user = await AIRequestGuard({ adapter: getUserAdapter, request: () => fetch('/user/1') })
 * ```
 */
export { default } from './guard'
export { default as AIRequestGuard } from './guard'
export { registry } from './registry'
export { validateSchema, hasDiff, pickBySchema, inferSchema } from './schema'
export { reportDiff, getDiffRecords, clearDiffRecords, generateReport } from './reporter'
export type { GuardOptions, GuardConfig, GuardMode, Schema, AdapterFn } from './types'
export type { SchemaDiff } from './schema'
