import type { GuardConfig, GuardOptions, RegisterOptions, AdapterFn } from './types'
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
 * 2. 通过 adapter 函数引用查找注册信息，执行转换
 * 3. dev 模式下对 adapter 输出做 schema diff 校验
 *
 * @param options 接口配置项，包含 adapter 函数引用和 request
 * @returns 经过 adapter 转换后的 ViewModel Promise
 */
async function AIRequestGuard<T = unknown>(options: GuardOptions<T>): Promise<T> {
  const { adapter, request, mode } = options

  if (typeof adapter !== 'function') {
    return Promise.reject(
      new TypeError(
        `[AIRequestGuard] "adapter" must be a function, but got "${typeof adapter}". ` +
          `Check for circular imports or missing exports.`
      )
    )
  }
  if (typeof request !== 'function') {
    return Promise.reject(
      new TypeError(`[AIRequestGuard] "request" must be a function, but got "${typeof request}".`)
    )
  }

  const effectiveMode = mode ?? _config.mode ?? 'real'

  if (__DEV__ && effectiveMode === 'mock') {
    const entry = registry.get(adapter as AdapterFn)
    const raw = resolveMock(entry?.id ?? adapter.name ?? 'anonymous', entry?.viewSchema)
    return applyAdapter<T>(adapter as AdapterFn<T>, raw)
  }

  const raw = await request()
  return applyAdapter<T>(adapter as AdapterFn<T>, raw)
}

/**
 * 查找并执行 adapter，完成 raw → ViewModel 转换。
 *
 * - 未注册 adapter：dev 模式警告并透传原始数据
 * - 已注册 adapter：执行转换，dev 模式下追加 schema diff 校验
 */
function applyAdapter<T>(adapter: AdapterFn<T>, raw: unknown): T {
  const entry = registry.get(adapter as AdapterFn)

  if (!entry) {
    if (_config.dev) {
      const name = adapter.name || 'anonymous'
      console.warn(
        `[AIRequestGuard] Adapter "${name}" is not registered. ` +
          `Call AIRequestGuard.register({ adapter: ${name} }) before use.`
      )
    }
    return adapter(raw)
  }

  const result = adapter(raw)

  if (_config.dev && entry.schema) {
    const diff = validateSchema(entry.id, result, entry.schema)
    if (__DEV__) reportDiff(diff)
    if (hasDiff(diff)) {
      console.warn(`[AIRequestGuard] Schema diff detected for "${entry.id}":`, diff)
    }
  } else if (_config.dev && !entry.viewSchema) {
    if (__DEV__) {
      console.info(`[AIRequestGuard] No viewSchema configured for "${entry.id}", skipping diff check.`)
    }
  }

  if (entry.schema && Object.keys(entry.schema).length > 0) {
    return pickBySchema(result, entry.schema) as T
  }

  return result
}

/**
 * 注册 adapter。
 *
 * adapter 是一个纯函数，负责将后端 DTO（raw）映射为前端 ViewModel。
 * 函数名自动作为内部 ID，dev 模式下重复注册同一函数会发出警告。
 *
 * @example
 * AIRequestGuard.register({
 *   viewSchema: () => ({ id: 1, name: '' }),
 *   adapter: getEmployeePageAdapter,
 * })
 */
AIRequestGuard.register = function <T>(options: RegisterOptions<T>): void {
  const { adapter } = options
  if (typeof adapter !== 'function') {
    console.error(
      `[AIRequestGuard] register() requires a function as "adapter", but got "${typeof adapter}". ` +
        `Check for circular imports or missing exports.`
    )
    return
  }
  if (_config.dev && registry.has(adapter as AdapterFn)) {
    const name = adapter.name || 'anonymous'
    console.warn(`[AIRequestGuard] Adapter "${name}" is being overwritten.`)
  }
  registry.register(options)
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
 * @param pattern  匹配规则：字符串（url 包含匹配）或正则表达式
 * @param adapter  已通过 AIRequestGuard.register() 注册的 adapter 函数引用
 *
 * @example
 * AIRequestGuard.watch('/api/employee/page', getEmployeePageAdapter)
 * AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)
 */
AIRequestGuard.watch = function (pattern: string | RegExp, adapter: AdapterFn): void {
  if (__DEV__) {
    if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
      console.error(`[AIRequestGuard] watch() requires a string or RegExp as "pattern".`)
      return
    }
    if (typeof adapter !== 'function') {
      console.error(
        `[AIRequestGuard] watch() requires a function as "adapter", but got "${typeof adapter}". ` +
          `Check for circular imports or missing exports.`
      )
      return
    }
    watchUrl(pattern, adapter)
  }
}

/**
 * 清空所有 watch 规则，主要用于测试环境重置。
 */
AIRequestGuard.clearWatch = function (): void {
  if (__DEV__) clearWatchMap()
}

export default AIRequestGuard
