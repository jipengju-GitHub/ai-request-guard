import { writeFileSync } from 'fs'
import { resolve } from 'path'

/** Mirror of SchemaDiff from @ai-request-guard/core — kept local to avoid Node import issues */
interface SchemaDiff {
  id: string
  missingFields: string[]
  extraFields: string[]
  typeMismatches: Array<{ field: string; expected: string; actual: string }>
}

interface RawRecord {
  id: string
  url: string
  rawKeys: string[]
  capturedAt: string
}

export interface AIGuardWebpackPluginOptions {
  /**
   * 是否启用自动上报功能（fetch 拦截 + devServer 端点 + HTML 报告）。
   * 设为 true 后才会安装 fetch 拦截器并启动 devServer 端点；未启用时插件为空操作，不会报错。
   * @default false
   */
  reporting?: boolean
  /**
   * 报告文件输出路径，相对于项目根目录（webpack context）。
   * @default 'ai-request-guard-report.html'
   */
  outFile?: string
  /**
   * 拦截的 HTTP 方法，只有请求方法在此列表中时才会上报 raw 数据。
   * @default ['GET']
   */
  methods?: string[]
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateReport(records: SchemaDiff[], rawMap: Map<string, RawRecord>): string {
  const now = new Date().toLocaleString()
  const total = records.length
  const hasDiffCount = records.filter(
    (r) => r.missingFields.length > 0 || r.typeMismatches.length > 0
  ).length

  const rowsHtml = records
    .map((r) => {
      const hasProblem = r.missingFields.length > 0 || r.typeMismatches.length > 0
      const statusClass = hasProblem ? 'warn' : 'ok'
      const statusIcon = hasProblem ? '⚠' : '✓'
      const raw = rawMap.get(r.id)
      const urlCell = raw ? `<span class="url">${escHtml(raw.url)}</span>` : '—'
      return `<tr class="${statusClass}">
        <td><span>${statusIcon}</span> ${escHtml(r.id)}</td>
        <td class="url-cell">${urlCell}</td>
        <td>${r.missingFields.length}</td>
        <td>${r.typeMismatches.length}</td>
        <td>${r.extraFields.length}</td>
      </tr>`
    })
    .join('\n')

  const detailsHtml = records
    .filter((r) => r.missingFields.length > 0 || r.typeMismatches.length > 0)
    .map((r) => {
      const raw = rawMap.get(r.id)
      const rawSection = raw
        ? `<div class="raw-keys">原始字段：${raw.rawKeys.map((k) => `<code>${escHtml(k)}</code>`).join(' ')}</div>`
        : ''
      const missing = r.missingFields
        .map((f) => `<li class="missing">缺失字段: <code>${escHtml(f)}</code></li>`)
        .join('\n')
      const mismatches = r.typeMismatches
        .map(
          (m) =>
            `<li class="mismatch">类型不匹配: <code>${escHtml(m.field)}</code> — 期望 <code>${escHtml(m.expected)}</code>，实际 <code>${escHtml(m.actual)}</code></li>`
        )
        .join('\n')
      return `<details open>
        <summary><strong>${escHtml(r.id)}</strong>${raw ? ` <span class="captured-at">采集于 ${escHtml(raw.capturedAt)}</span>` : ''}</summary>
        ${rawSection}
        <ul>${missing}${mismatches}</ul>
      </details>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>AIRequestGuard — Schema Diff Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d1117;color:#c9d1d9;padding:32px}
h1{color:#58a6ff;font-size:20px;margin-bottom:4px}
.meta{color:#8b949e;font-size:12px;margin-bottom:24px}
.summary-bar{display:flex;gap:16px;margin-bottom:24px}
.badge{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:12px 20px}
.badge .num{font-size:28px;font-weight:700;color:#58a6ff}
.badge .lbl{font-size:12px;color:#8b949e;margin-top:2px}
.badge.warn .num{color:#f0883e}
table{width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px}
th{text-align:left;padding:8px 12px;border-bottom:1px solid #30363d;color:#8b949e;font-weight:normal}
td{padding:8px 12px;border-bottom:1px solid #21262d;vertical-align:middle}
.url-cell{font-size:11px;color:#8b949e;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr.warn td{color:#f0883e}
tr.warn .url-cell{color:#8b949e}
tr.ok td{color:#3fb950}
tr.ok .url-cell{color:#8b949e}
details{background:#161b22;border:1px solid #30363d;border-radius:6px;margin-bottom:12px;padding:12px 16px}
summary{cursor:pointer;font-size:14px;color:#c9d1d9;padding:2px 0;display:flex;align-items:center;gap:8px}
summary:hover{color:#58a6ff}
.captured-at{font-size:11px;color:#8b949e;font-weight:normal}
.raw-keys{font-size:12px;color:#8b949e;margin:8px 0 6px;line-height:1.8}
ul{margin-top:6px;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px}
li{font-size:13px;padding:6px 10px;border-radius:4px}
li.missing{background:rgba(240,136,62,.1);border-left:3px solid #f0883e}
li.mismatch{background:rgba(248,81,73,.1);border-left:3px solid #f85149}
code{font-family:monospace;background:#0d1117;padding:1px 5px;border-radius:3px}
.empty{color:#8b949e;font-size:13px;padding:20px 0;text-align:center}
</style>
</head>
<body>
<h1>AIRequestGuard — Schema Diff Report</h1>
<p class="meta">生成时间：${escHtml(now)} | 共 ${total} 个接口，${hasDiffCount} 个有差异</p>
<div class="summary-bar">
  <div class="badge${hasDiffCount > 0 ? ' warn' : ''}">
    <div class="num">${hasDiffCount}</div><div class="lbl">有差异接口</div>
  </div>
  <div class="badge">
    <div class="num">${total}</div><div class="lbl">已检测接口</div>
  </div>
  <div class="badge">
    <div class="num">${rawMap.size}</div><div class="lbl">真实请求已采集</div>
  </div>
</div>
<table>
  <thead><tr><th>接口 ID</th><th>URL</th><th>缺失字段</th><th>类型不匹配</th><th>多余字段</th></tr></thead>
  <tbody>${rowsHtml || '<tr><td colspan="5" class="empty">暂无记录</td></tr>'}</tbody>
</table>
${detailsHtml || '<p class="empty">所有接口 schema 均匹配，无差异 ✓</p>'}
</body>
</html>`
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
  })
}

function findIdByUrl(url: string, records: Map<string, SchemaDiff>): string | undefined {
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]
    for (const id of records.keys()) {
      if (pathname.includes(id)) return id
    }
    const segments = pathname.split('/').filter(Boolean)
    for (const id of records.keys()) {
      const idSegments = id.split(/[-/]/)
      if (idSegments.some((seg) => segments.includes(seg))) return id
    }
  } catch { /* invalid url */ }
  return undefined
}

/**
 * AIRequestGuard Webpack 插件。
 *
 * 兼容 webpack-dev-server v3（Vue CLI 4）和 v4。
 *
 * 功能（需 reporting: true 启用）：
 * 1. `/__ai-guard/report` POST — 接收浏览器上报的 schema diff 数据，更新报告
 * 2. `/__ai-guard/raw` POST — 接收真实 GET 请求拦截的 raw 数据快照
 * 3. 生成自包含 HTML 差异报告
 *
 * 浏览器端：在 vue.config.js 的 `configureWebpack.entry` 中追加
 * `@ai-request-guard/webpack-plugin/report-sink` 来安装 fetch 拦截器和自动上报。
 *
 * @example
 * // vue.config.js
 * const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')
 * module.exports = {
 *   configureWebpack: {
 *     plugins: [new AIGuardWebpackPlugin({ reporting: true })],
 *   },
 *   devServer: {
 *     // 已由插件自动注入，无需手动配置
 *   },
 * }
 */
export class AIGuardWebpackPlugin {
  private readonly reporting: boolean
  private readonly outFile: string
  private readonly allowedMethods: string[]

  private readonly records = new Map<string, SchemaDiff>()
  private readonly rawRecords = new Map<string, RawRecord>()
  private rootDir = process.cwd()

  constructor(options: AIGuardWebpackPluginOptions = {}) {
    this.reporting = options.reporting ?? false
    this.outFile = options.outFile ?? 'ai-request-guard-report.html'
    this.allowedMethods = (options.methods ?? ['GET']).map((m) => m.toUpperCase())
  }

  private writeReport(): void {
    const list = Array.from(this.records.values())
    const html = generateReport(list, this.rawRecords)
    writeFileSync(resolve(this.rootDir, this.outFile), html, 'utf-8')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(compiler: any): void {
    if (!this.reporting) return

    this.rootDir = compiler.context ?? process.cwd()

    const self = this

    // Hook into webpack-dev-server.
    // Vue CLI 4 uses webpack-dev-server v3 which exposes `compiler.options.devServer.before`.
    // webpack-dev-server v4 uses `setupMiddlewares`.
    // We use the compiler `afterPlugins` hook to append our middleware configuration.
    compiler.hooks.afterPlugins.tap('AIGuardWebpackPlugin', () => {
      const devServerOptions = compiler.options.devServer ?? {}

      // webpack-dev-server v4 / webpack 5
      if (!devServerOptions.setupMiddlewares) {
        devServerOptions.setupMiddlewares = (middlewares: unknown[], devServer: { app: import('http').Server }) => {
          self._applyMiddlewares(devServer.app)
          return middlewares
        }
      } else {
        const orig = devServerOptions.setupMiddlewares
        devServerOptions.setupMiddlewares = (middlewares: unknown[], devServer: { app: import('http').Server }) => {
          self._applyMiddlewares(devServer.app)
          return orig(middlewares, devServer)
        }
      }

      // webpack-dev-server v3 / Vue CLI 4 fallback
      if (!devServerOptions.before) {
        devServerOptions.before = (app: import('http').Server) => {
          self._applyMiddlewares(app)
        }
      } else {
        const orig = devServerOptions.before
        devServerOptions.before = (app: import('http').Server, server: unknown, compiler: unknown) => {
          self._applyMiddlewares(app)
          orig(app, server, compiler)
        }
      }

      compiler.options.devServer = devServerOptions
    })
  }

  /**
   * 手动将 devServer 中间件注册到 express app 上。
   * Vue CLI 4 / webpack-dev-server v3 项目请在 `devServer.before` 中调用此方法。
   *
   * @example
   * // vue.config.js
   * const plugin = new AIGuardWebpackPlugin({ reporting: true })
   * module.exports = {
   *   configureWebpack: { plugins: [plugin] },
   *   devServer: {
   *     before(app) { plugin.applyMiddlewares(app) }
   *   }
   * }
   */
  applyMiddlewares(app: any): void {
    this._applyMiddlewares(app)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _applyMiddlewares(app: any): void {
    const self = this

    // express-style middleware registration (both v3 and v4 expose app.use / app.post / app.all)
    const useRoute = (path: string, handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void) => {
      // Prefer app.all for maximum compatibility; fall back to app.use
      if (typeof app.all === 'function') {
        app.all(path, handler)
      } else {
        app.use(path, handler)
      }
    }

    useRoute('/__ai-guard/report', async (req, res) => {
      if (req.method !== 'POST') { res.writeHead(405).end(); return }
      const body = await readBody(req)
      try {
        const incoming: SchemaDiff[] = JSON.parse(body)
        for (const diff of incoming) self.records.set(diff.id, diff)
        self.writeReport()
        console.log(`[ai-request-guard] diff report updated → ${self.outFile} (${self.records.size} interfaces)`)
      } catch { /* malformed — ignore */ }
      res.writeHead(204).end()
    })

    useRoute('/__ai-guard/raw', async (req, res) => {
      if (req.method !== 'POST') { res.writeHead(405).end(); return }
      const body = await readBody(req)
      try {
        const { url, raw } = JSON.parse(body) as { url: string; method: string; raw: unknown }
        if (typeof raw === 'object' && raw !== null) {
          const matchedId = findIdByUrl(url, self.records)
          if (matchedId) {
            self.rawRecords.set(matchedId, {
              id: matchedId,
              url,
              rawKeys: Object.keys(raw as Record<string, unknown>),
              capturedAt: new Date().toLocaleTimeString(),
            })
            self.writeReport()
            console.log(`[ai-request-guard] raw captured: ${matchedId} ← ${url}`)
          }
        }
      } catch { /* malformed — ignore */ }
      res.writeHead(204).end()
    })
  }

  /**
   * 生成浏览器端入口代码字符串，供注入到 webpack entry 中。
   * 与 vite-plugin 虚拟模块功能等价：安装 fetch 拦截器 + 自动上报。
   *
   * 如果 reporting 未启用，返回空字符串（无操作）。
   */
  getBrowserEntryCode(): string {
    if (!this.reporting) return ''
    const methodsJson = JSON.stringify(this.allowedMethods)
    return `
import { getDiffRecords } from '@ai-request-guard/core'

const ALLOWED_METHODS = ${methodsJson}
const _originalFetch = window.fetch.bind(window)

window.fetch = async function(input, init) {
  const method = ((init && init.method) || 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const response = await _originalFetch(input, init)
  if (!ALLOWED_METHODS.includes(method)) return response
  response.clone().json().then(raw => {
    const payload = JSON.stringify({ url, method, raw })
    navigator.sendBeacon('/__ai-guard/raw', new Blob([payload], { type: 'application/json' }))
  }).catch(() => {})
  return response
}

export function flushReport() {
  const records = getDiffRecords()
  if (!records.length) return
  navigator.sendBeacon('/__ai-guard/report', new Blob([JSON.stringify(records)], { type: 'application/json' }))
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushReport()
})
window.addEventListener('beforeunload', flushReport)
`
  }
}
