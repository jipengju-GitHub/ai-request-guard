/**
 * mock 模块：在 mock 模式下提供本地数据，替代真实网络请求。
 *
 * 支持两种数据来源（viewSchema）：
 * 1. viewSchema 为工厂函数：每次调用时执行，返回视图层数据
 * 2. viewSchema 为静态值：直接使用
 * 3. 无 viewSchema：返回 null，dev 模式下发出警告
 */

/** dev 模式标志，由外部注入（guard.ts 调用时传入） */
let _dev = false

/** 供 guard.ts 在 configure 时同步 dev 状态 */
export function setMockDev(dev: boolean): void {
  _dev = dev
}

/**
 * 解析 mock 数据，返回用于 adapter 转换的原始数据。
 *
 * @param id         接口内部 ID（来自 adapter.name），仅用于警告信息
 * @param viewSchema 静态数据或工厂函数，来自 RegisterOptions.viewSchema
 */
export function resolveMock(id: string, viewSchema?: unknown | (() => unknown)): unknown {
  if (typeof viewSchema === 'function') {
    return (viewSchema as () => unknown)()
  }

  if (viewSchema !== undefined) {
    return viewSchema
  }

  if (_dev) {
    console.warn(
      `[AIRequestGuard] Mock mode is active for "${id}" but no viewSchema was provided. ` +
        `Pass viewSchema in AIRequestGuard.register({ viewSchema, adapter }) or switch to real mode.`
    )
  }

  return null
}
