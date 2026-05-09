export interface Schema {
  [key: string]: unknown | Schema | Schema[]
}

/** adapter 转换函数类型：接收原始 DTO，返回 ViewModel */
export type AdapterFn<T = unknown> = (raw: unknown) => T

/** 请求模式：real 发起真实网络请求，mock 使用本地数据 */
export type GuardMode = 'real' | 'mock'

export interface RegisterOptions<T = unknown> {
  /**
   * 前端视图层期望的数据结构，支持静态值或工厂函数。
   * - 静态值：直接作为 viewSchema 数据
   * - 工厂函数：每次调用时执行（兼容 mockjs：`() => Mock.mock(template)`）
   *
   * 内部自动推导 schema 用于 dev 模式 diff 校验；mock 模式下作为返回数据。
   * 未传则跳过 diff 校验，报告标记"未配置 viewSchema"。
   */
  viewSchema?: unknown | (() => unknown)
  /** adapter 转换函数，函数名自动作为内部 ID */
  adapter: AdapterFn<T>
}

export interface GuardOptions<T = unknown> {
  /** 已通过 AIRequestGuard.register() 注册的 adapter 函数引用 */
  adapter: AdapterFn<T>
  /** 发起真实请求的函数，mock 模式下不会被调用 */
  request: () => Promise<unknown>
  /** 单接口模式，优先级高于全局 mode */
  mode?: GuardMode
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
