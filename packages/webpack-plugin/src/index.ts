import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { inferSchema } from '../../core/src/index'
import { generateAdapter, openaiCompatible, anthropic, buildGuiHtml } from '../../ai/src/index'
import type { AIProvider, OpenAICompatibleOptions, AnthropicOptions } from '../../ai/src/types'

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

export interface AIGuardAIOptions {
  provider: 'openai-compatible' | 'anthropic'
  baseURL?: string
  apiKey: string
  model?: string
  /** @default 2000 */
  maxTokens?: number
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
  /**
   * AI provider 配置，配置后启用 /__ai-guard GUI 管理界面（仅 dev 环境）。
   */
  ai?: AIGuardAIOptions
  /**
   * adapter 文件输出目录，相对于项目根目录。
   * @default 'src/adapters'
   */
  adaptersDir?: string
  /**
   * 生成文件的扩展名。
   * @default 'ts'
   */
  fileType?: 'ts' | 'js'
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
  private readonly aiOpts: AIGuardAIOptions | undefined
  private readonly adaptersDir: string
  private readonly fileType: 'ts' | 'js'

  private readonly records = new Map<string, SchemaDiff>()
  private readonly rawRecords = new Map<string, RawRecord>()
  private rootDir = process.cwd()

  constructor(options: AIGuardWebpackPluginOptions = {}) {
    this.reporting = options.reporting ?? false
    this.outFile = options.outFile ?? 'ai-request-guard-report.html'
    this.allowedMethods = (options.methods ?? ['GET']).map((m) => m.toUpperCase())
    this.aiOpts = options.ai
    this.adaptersDir = options.adaptersDir ?? 'src/adapters'
    this.fileType = options.fileType ?? 'ts'
  }

  private buildProvider(): AIProvider | null {
    const aiOpts = this.aiOpts
    if (!aiOpts) return null
    if (aiOpts.provider === 'anthropic') {
      const opts: AnthropicOptions = { apiKey: aiOpts.apiKey }
      if (aiOpts.model) opts.model = aiOpts.model
      if (aiOpts.maxTokens) opts.maxTokens = aiOpts.maxTokens
      return anthropic(opts)
    }
    if (!aiOpts.baseURL) throw new Error('[ai-request-guard] ai.baseURL is required for openai-compatible provider')
    const opts: OpenAICompatibleOptions = {
      baseURL: aiOpts.baseURL,
      apiKey: aiOpts.apiKey,
      model: aiOpts.model ?? 'deepseek-chat',
    }
    if (aiOpts.maxTokens) opts.maxTokens = aiOpts.maxTokens
    return openaiCompatible(opts)
  }

  private writeReport(): void {
    const list = Array.from(this.records.values())
    const html = generateReport(list, this.rawRecords)
    writeFileSync(resolve(this.rootDir, this.outFile), html, 'utf-8')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(compiler: any): void {
    if (!this.reporting && !this.aiOpts) return

    this.rootDir = compiler.context ?? process.cwd()

    const self = this

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

    // Print GUI address after compilation (server is up by then)
    compiler.hooks.done.tap('AIGuardWebpackPlugin', () => {
      const port = compiler.options.devServer?.port ?? 8080
      const host = 'localhost'
      console.log(`\n  \x1b[32m➜\x1b[0m  AIRequestGuard GUI:  \x1b[36mhttp://${host}:${port}/__ai-guard\x1b[0m\n`)
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

    // Single middleware handling all /__ai-guard* routes to avoid express prefix-stripping issues
    app.use(async (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => {
      const url = req.url ?? '/'
      const method = req.method ?? 'GET'

      if (!url.startsWith('/__ai-guard')) { next(); return }

      // GET /__ai-guard → GUI 页面
      if (method === 'GET' && (url === '/__ai-guard' || url === '/__ai-guard/')) {
        const html = buildGuiHtml({ aiConfigured: !!self.aiOpts, adaptersDir: self.adaptersDir, fileType: self.fileType })
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(html)
        return
      }

      // POST /__ai-guard/generate
      if (method === 'POST' && url === '/__ai-guard/generate') {
        const body = await readBody(req)
        const provider = self.buildProvider()
        if (!provider) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: '未配置 AI provider，请在插件配置中添加 ai.apiKey' }))
          return
        }
        try {
          const { id, mock, raw } = JSON.parse(body) as { id: string; mock: Record<string, unknown>; raw: Record<string, unknown> }
          const schema = inferSchema(mock)
          const result = await generateAdapter({ provider, adapterId: id, schema, raw })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: String(err) }))
        }
        return
      }

      // POST /__ai-guard/write-file
      if (method === 'POST' && url === '/__ai-guard/write-file') {
        const body = await readBody(req)
        try {
          const { id, code } = JSON.parse(body) as { id: string; code: string }
          const fileName = id.replace(/[^a-zA-Z0-9-_]/g, '-') + '.' + self.fileType
          const dir = resolve(self.rootDir, self.adaptersDir)
          const filePath = resolve(dir, fileName)
          if (existsSync(filePath)) {
            res.writeHead(409, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `文件已存在: ${filePath}，请手动处理` }))
            return
          }
          mkdirSync(dir, { recursive: true })
          writeFileSync(filePath, code, 'utf-8')
          const relPath = self.adaptersDir.replace(/\\/g, '/') + '/' + fileName
          console.log(`[ai-request-guard] adapter written → ${relPath}`)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ path: relPath }))
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: String(err) }))
        }
        return
      }

      if (!self.reporting) { next(); return }

      // POST /__ai-guard/report
      if (url === '/__ai-guard/report') {
        if (method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readBody(req)
        try {
          const incoming: SchemaDiff[] = JSON.parse(body)
          for (const diff of incoming) self.records.set(diff.id, diff)
          self.writeReport()
          console.log(`[ai-request-guard] diff report updated → ${self.outFile} (${self.records.size} interfaces)`)
        } catch { /* malformed — ignore */ }
        res.writeHead(204).end()
        return
      }

      // POST /__ai-guard/raw
      if (url === '/__ai-guard/raw') {
        if (method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readBody(req)
        try {
          const { url: reqUrl, raw } = JSON.parse(body) as { url: string; method: string; raw: unknown }
          if (typeof raw === 'object' && raw !== null) {
            const matchedId = findIdByUrl(reqUrl, self.records)
            if (matchedId) {
              self.rawRecords.set(matchedId, {
                id: matchedId,
                url: reqUrl,
                rawKeys: Object.keys(raw as Record<string, unknown>),
                capturedAt: new Date().toLocaleTimeString(),
              })
              self.writeReport()
              console.log(`[ai-request-guard] raw captured: ${matchedId} ← ${reqUrl}`)
            }
          }
        } catch { /* malformed — ignore */ }
        res.writeHead(204).end()
        return
      }

      next()
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
