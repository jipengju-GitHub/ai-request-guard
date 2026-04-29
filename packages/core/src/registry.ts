import type { AdapterFn } from './types'

/** 全局 adapter 注册表，key 为接口 ID，value 为转换函数 */
const _registry = new Map<string, AdapterFn>()

export const registry = {
  /**
   * 注册一个 adapter。
   * 同一 id 重复注册会覆盖旧值（调用方负责发出警告）。
   *
   * @param id  接口唯一 ID
   * @param fn  转换函数
   */
  register<T>(id: string, fn: AdapterFn<T>): void {
    _registry.set(id, fn as AdapterFn)
  },

  /**
   * 根据 id 获取已注册的 adapter，不存在则返回 undefined。
   *
   * @param id 接口唯一 ID
   */
  get(id: string): AdapterFn | undefined {
    return _registry.get(id)
  },

  /**
   * 判断指定 id 是否已注册 adapter。
   *
   * @param id 接口唯一 ID
   */
  has(id: string): boolean {
    return _registry.has(id)
  },

  /** 清空所有已注册的 adapter，主要用于测试环境重置。 */
  clear(): void {
    _registry.clear()
  },
}
