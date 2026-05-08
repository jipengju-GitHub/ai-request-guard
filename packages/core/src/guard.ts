import type { GuardConfig, GuardOptions, AdapterFn } from './types'
import { registry } from './registry'
import { validateSchema, hasDiff, pickBySchema } from './schema'
import { resolveMock, setMockDev } from './mock'
import { reportDiff } from './reporter'
import { watchUrl, clearWatchMap } from './interceptor'

const GLOBAL_KEY = '__AI_REQUEST_GUARD_V0__'

function getGlobalConfig(): GuardConfig {
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {}
  }
  if (!g[GLOBAL_KEY].config) {
    g[GLOBAL_KEY].config = {
      mode: 'real',
      dev: typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false,
    }
  }
  return g[GLOBAL_KEY].config
}

/** 全局运行时配置，dev 默认根据 NODE_ENV 自动判断 */
let _config: GuardConfig = getGlobalConfig()

// 初始化时同步 dev 状态到 mock 模块（生产构建时被 tree-shake）
if (__DEV__) {
  setMockDev(_config.dev ?? false)
}

/**
 * AIRequestGuard 主函数，防腐层入口。
 *
 * 执行顺序：
 * 1. 判断当前模式（mock / real），mock 模式跳过真实请求
 * 2. 查找已注册的 adapter，有则转换，无则透传原始数据（dev 模式下发出警告）
 * 3. dev 模式下对 adapter 输出做 schema diff 校验
 *
 * @param options 接口配置项，包含 id、request、schema、mode、mockData
 * @returns 经过 adapter 转换后的 ViewModel Promise
 */
async function AIRequestGuard<T = unknown>(options: GuardOptions<T>): Promise<T> {
  const { id, request, schema, mode, mockData } = options
  // 单接口 mode 优先级高于全局 mode
  const effectiveMode = mode ?? _config.mode ?? 'real'

  // mock 分支在生产构建时通过 rollup replace 插件将 __DEV__ 替换为 false，
  // 使整个 if 块成为 dead code 被 tree-shake 掉，确保 mock 代码不进入生产产物。
  if (__DEV__ && effectiveMode === 'mock') {
    const raw = resolveMock(id, mockData as ((id: string) => unknown) | undefined)
    return applyAdapter<T>(id, raw, schema)
  }

  const raw = await request()
  return applyAdapter<T>(id, raw, schema)
}

/**
 * 查找并执行 adapter，完成 raw → ViewModel 转换。
 *
 * - 未注册 adapter：dev 模式警告并透传原始数据
 * - 已注册 adapter：执行转换，dev 模式下追加 schema diff 校验
 *
 * @param id      接口唯一 ID
 * @param raw     接口原始返回数据
 * @param schema  期望的 ViewModel 结构，用于 diff 校验
 */
function applyAdapter<T>(id: string, raw: unknown, schema: GuardOptions['schema']): T {
  const adapter = registry.get(id) as AdapterFn<T> | undefined

  if (!adapter) {
    if (_config.dev) {
      console.warn(
        `[AIRequestGuard] No adapter registered for "${id}". Raw data passed through. ` +
          `Call AIRequestGuard.register("${id}", fn) to define a mapping.`
      )
    }
    return raw as T
  }

  const result = adapter(raw)

  if (_config.dev && schema) {
    const diff = validateSchema(id, result, schema)
    if (__DEV__) reportDiff(diff)
    if (hasDiff(diff)) {
      console.warn(`[AIRequestGuard] Schema diff detected for "${id}":`, diff)
    }
  }

  if (schema && Object.keys(schema).length > 0) {
    return pickBySchema(result, schema) as T
  }

  return result
}

/**
 * 注册 adapter。
 *
 * adapter 是一个纯函数，负责将后端 DTO（raw）映射为前端 ViewModel。
 * dev 模式下重复注册同一 id 会发出警告。
 *
 * @param id  接口唯一 ID，与 AIRequestGuard({ id }) 对应
 * @param fn  转换函数 (raw: unknown) => T
 *
 * @example
 * AIRequestGuard.register('user-detail', (raw) => ({
 *   id: raw.user_id,
 *   userName: raw.username,
 * }))
 */
AIRequestGuard.register = function <T>(id: string, fn: AdapterFn<T>): void {
  if (_config.dev && registry.has(id)) {
    console.warn(`[AIRequestGuard] Adapter for "${id}" is being overwritten.`)
  }
  registry.register(id, fn)
}

/**
 * 切换全局请求模式。
 *
 * 注意：mock 模式在生产构建中会被 tree-shake，切换无效。
 *
 * @param mode 'real' 发起真实请求 | 'mock' 使用本地 mock 数据（仅开发环境生效）
 */
AIRequestGuard.setMode = function (mode: GuardConfig['mode']): void {
  _config.mode = mode
}

/**
 * 更新全局配置，传入的字段会与现有配置浅合并。
 * dev 状态变更时会同步到 mock 模块。
 *
 * @param config 需要覆盖的配置项
 *
 * @example
 * AIRequestGuard.configure({ dev: true, mode: 'mock' })
 */
AIRequestGuard.configure = function (config: GuardConfig): void {
  Object.assign(_config, config)
  if (config.dev !== undefined && __DEV__) {
    setMockDev(_config.dev ?? false)
  }
}

/**
 * 注册真实请求拦截规则（仅 dev 构建生效）。
 *
 * 当 fetch 发出的 GET 请求 url 匹配 pattern 时，响应 raw data 会被自动上报给
 * devServer（`/__ai-guard/raw`），由 Node 端执行 adapter 转换并做 schema diff 校验。
 *
 * 适用于查询类接口。增删改接口的响应结构无需映射，无需注册。
 *
 * @param pattern 匹配规则：字符串（url 包含匹配）或正则表达式
 * @param id      已通过 AIRequestGuard.register() 注册的 adapter id
 *
 * @example
 * AIRequestGuard.watch('/api/user/detail', 'user-detail')
 * AIRequestGuard.watch(/\/api\/order\/\d+/, 'order-detail')
 */
AIRequestGuard.watch = function (pattern: string | RegExp, id: string): void {
  if (__DEV__) watchUrl(pattern, id)
}

/**
 * 清空所有 watch 规则，主要用于测试环境重置。
 */
AIRequestGuard.clearWatch = function (): void {
  if (__DEV__) clearWatchMap()
}

export default AIRequestGuard
