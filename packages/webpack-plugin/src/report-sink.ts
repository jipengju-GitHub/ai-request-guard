/**
 * 浏览器端入口模块。
 *
 * 在 webpack 项目中，将此文件添加到入口来安装 fetch 拦截器和自动上报：
 *
 * ```js
 * // vue.config.js
 * module.exports = {
 *   configureWebpack: (config) => {
 *     if (process.env.NODE_ENV === 'development') {
 *       // 将 report-sink 注入到主入口的开头
 *       const entry = config.entry.app
 *       config.entry.app = ['@ai-request-guard/webpack-plugin/report-sink', ...entry]
 *     }
 *   },
 * }
 * ```
 *
 * 或者在 main.js 中直接 import：
 * ```js
 * // main.js (仅开发环境)
 * if (process.env.NODE_ENV === 'development') {
 *   import('@ai-request-guard/webpack-plugin/report-sink')
 * }
 * ```
 */
import { getDiffRecords } from '@ai-request-guard/core'

const _originalFetch = window.fetch.bind(window)

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = ((init?.method) ?? 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  const response = await _originalFetch(input, init)
  if (method !== 'GET') return response
  response.clone().json().then((raw: unknown) => {
    const payload = JSON.stringify({ url, method, raw })
    navigator.sendBeacon('/__ai-guard/raw', new Blob([payload], { type: 'application/json' }))
  }).catch(() => {})
  return response
}

export function flushReport(): void {
  const records = getDiffRecords()
  if (!records.length) return
  navigator.sendBeacon('/__ai-guard/report', new Blob([JSON.stringify(records)], { type: 'application/json' }))
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushReport()
})
window.addEventListener('beforeunload', flushReport)
