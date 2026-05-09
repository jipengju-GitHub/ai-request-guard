import type { AdapterFn, Schema } from './types'
import { inferSchema } from './schema'

const GLOBAL_KEY = '__AI_REQUEST_GUARD_V0__'

export interface RegistryEntry {
  id: string
  viewSchema?: unknown | (() => unknown)
  schema?: Schema
}

interface GlobalStore {
  weakRegistry: WeakMap<AdapterFn, RegistryEntry>
}

function getGlobalStore(): GlobalStore {
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { weakRegistry: new WeakMap<AdapterFn, RegistryEntry>() }
  }
  if (!g[GLOBAL_KEY].weakRegistry) {
    g[GLOBAL_KEY].weakRegistry = new WeakMap<AdapterFn, RegistryEntry>()
  }
  return g[GLOBAL_KEY]
}

const _store = getGlobalStore()

export const registry = {
  /**
   * 注册 adapter，以函数引用为 key 存入 WeakMap。
   * id 自动取 adapter.name（函数名）。
   */
  register<T>(options: { viewSchema?: unknown | (() => unknown); adapter: AdapterFn<T> }): void {
    const { adapter, viewSchema } = options
    if (typeof adapter !== 'function') {
      console.error(
        `[AIRequestGuard] register() requires a function as "adapter", but got "${typeof adapter}". ` +
          `Check for circular imports or missing exports.`
      )
      return
    }
    const id = adapter.name || 'anonymous'
    const raw = typeof viewSchema === 'function' ? (viewSchema as () => unknown)() : viewSchema
    const schema = raw != null ? inferSchema(raw as Record<string, unknown>) : undefined
    _store.weakRegistry.set(adapter as AdapterFn, { id, viewSchema, schema })
  },

  /**
   * 根据 adapter 函数引用获取注册信息，不存在则返回 undefined。
   */
  get(adapter: AdapterFn): RegistryEntry | undefined {
    return _store.weakRegistry.get(adapter)
  },

  /**
   * 判断指定 adapter 函数是否已注册。
   */
  has(adapter: AdapterFn): boolean {
    return _store.weakRegistry.has(adapter)
  },

  /**
   * 清空注册表，主要用于测试环境重置。
   * WeakMap 无法直接 clear，通过替换全局存储实现。
   */
  clear(): void {
    _store.weakRegistry = new WeakMap<AdapterFn, RegistryEntry>()
  },
}
