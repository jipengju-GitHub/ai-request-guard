export type Schema = Record<string, unknown>

/** adapter 转换函数类型：接收原始 DTO，返回 ViewModel */
export type AdapterFn<T = unknown> = (raw: unknown) => T

/** 请求模式：real 发起真实网络请求，mock 使用本地数据 */
export type GuardMode = 'real' | 'mock'

export interface GuardOptions<T = unknown> {
  /** 接口唯一 ID，用于关联已注册的 adapter */
  id: string
  /** 发起真实请求的函数，mock 模式下不会被调用 */
  request: () => Promise<unknown>
  /** 期望的 ViewModel 结构（字段名 → 默认值），dev 模式下用于 diff 校验 */
  schema?: Schema
  /** 单接口模式，优先级高于全局 mode */
  mode?: GuardMode
  /**
   * mock 模式下使用的本地数据，会经过 adapter 转换后返回。
   * 支持静态值或工厂函数（每次调用时执行），工厂函数可接收接口 id 作为参数。
   *
   * @example
   * mockData: { user_id: 1, username: 'mock' }
   * mockData: (id) => ({ user_id: id === 'user-detail' ? 1 : 2 })
   */
  mockData?: unknown | ((id: string) => unknown)
}

export interface GuardConfig {
  /** 全局请求模式，默认 'real' */
  mode?: GuardMode
  /**
   * 是否启用开发模式。
   * 开发模式下会输出 adapter 缺失警告、schema diff 提示、重复注册警告。
   * 默认根据 NODE_ENV 自动判断（非 production 则为 true）。
   */
  dev?: boolean
}
