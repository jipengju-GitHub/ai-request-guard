/**
 * mock 模块：在 mock 模式下提供本地数据，替代真实网络请求。
 *
 * 支持三种数据来源（优先级从高到低）：
 * 1. mockData 为工厂函数：每次调用时执行，可按 id 动态返回不同数据
 * 2. mockData 为静态值：直接使用
 * 3. 无 mockData：返回 null，dev 模式下发出警告
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
 * @param id       接口唯一 ID，工厂函数形式的 mockData 会接收此参数
 * @param mockData 静态数据或工厂函数，来自 GuardOptions.mockData
 */
export function resolveMock(id: string, mockData?: unknown | ((id: string) => unknown)): unknown {
  if (typeof mockData === 'function') {
    return (mockData as (id: string) => unknown)(id)
  }

  if (mockData !== undefined) {
    return mockData
  }

  if (_dev) {
    console.warn(
      `[AIRequestGuard] Mock mode is active for "${id}" but no mockData was provided. ` +
        `Pass mockData or switch to real mode.`
    )
  }

  return null
}
