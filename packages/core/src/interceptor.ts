/**
 * 真实请求拦截模块（仅 dev 构建）。
 *
 * 职责：
 * 1. 维护 url 模式 → adapter 函数引用的映射表（通过 watchUrl 注册）
 * 2. patch window.fetch，拦截匹配的 GET 响应，把 raw data 上报给 devServer
 * 3. 只上报已注册 adapter 的接口，增删改及无 adapter 的接口自动跳过
 *
 * 设计说明：
 * - 针对查询类接口（GET），增删改接口响应结构无需 adapter 映射，默认不拦截
 * - 生产构建中整个模块被 tree-shake，不影响线上行为
 */

import type { AdapterFn } from './types'

/** url 模式 → adapter 函数引用的映射，支持字符串包含匹配和正则 */
const _watchMap: Array<{ pattern: string | RegExp; adapter: AdapterFn }> = []

/** devServer 上报端点，与 vite-plugin 中保持一致 */
const REPORT_ENDPOINT = '/__ai-guard/raw'

/** 是否已 patch 过 fetch，防止重复安装 */
let _installed = false

/**
 * 注册一条 url → adapter 函数的监听规则。
 *
 * 当 fetch 请求的 url 匹配 pattern 时，响应 raw data 会自动上报给 devServer。
 *
 * @param pattern 匹配规则：字符串（包含匹配）或正则表达式
 * @param adapter 对应的 adapter 函数引用，需已通过 AIRequestGuard.register() 注册
 *
 * @example
 * AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
 * AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)
 */
export function watchUrl(pattern: string | RegExp, adapter: AdapterFn): void {
  _watchMap.push({ pattern, adapter })
  if (!_installed) {
    _installFetchInterceptor()
    _installed = true
  }
}

/**
 * 清空所有监听规则，主要用于测试环境重置。
 */
export function clearWatchMap(): void {
  _watchMap.length = 0
}

/** 根据 url 查找匹配的 adapter 函数，无匹配返回 undefined */
function matchAdapter(url: string): AdapterFn | undefined {
  for (const { pattern, adapter } of _watchMap) {
    if (typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)) {
      return adapter
    }
  }
  return undefined
}

/** 上报 raw 数据到 devServer，使用 sendBeacon 保证页面卸载时也能发出 */
function report(id: string, url: string, raw: unknown): void {
  const payload = JSON.stringify({ id, url, raw })
  const blob = new Blob([payload], { type: 'application/json' })
  navigator.sendBeacon(REPORT_ENDPOINT, blob)
}

/** patch window.fetch，仅拦截 GET 请求且 url 有匹配规则的响应 */
function _installFetchInterceptor(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return

  const _originalFetch = window.fetch.bind(window)

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = (init?.method ?? 'GET').toUpperCase()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    const response = await _originalFetch(input, init)

    if (method !== 'GET') return response
    const adapter = matchAdapter(url)
    if (!adapter) return response

    const id = adapter.name || 'anonymous'
    response
      .clone()
      .json()
      .then((raw: unknown) => {
        report(id, url, raw)
      })
      .catch(() => {
        // 非 JSON 响应跳过，不抛错
      })

    return response
  }
}
