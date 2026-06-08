import type { Plugin, ViteDevServer } from 'vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { openaiCompatible, anthropic, startGuiServer } from '../../ai/src/index'
import type { AIProvider, OpenAICompatibleOptions, AnthropicOptions } from '../../ai/src/types'

/** Mirror of SchemaDiff from @ai-request-guard/core — kept local to avoid Node import issues */
interface SchemaDiff {
  id: string
  missingFields: string[]
  extraFields: string[]
  typeMismatches: Array<{ field: string; expected: string; actual: string }>
}

/** 真实请求拦截上报的 raw 数据快照 */
interface RawRecord {
  id: string
  url: string
  /** 最近一次上报的原始响应数据（顶层字段快照） */
  rawKeys: string[]
  capturedAt: string
}

export interface AIGuardAIOptions {
  /** AI provider preset to use */
  provider: 'openai-compatible' | 'anthropic'
  /** Required for openai-compatible */
  baseURL?: string
  apiKey: string
  model?: string
  /** @default 2000 */
  maxTokens?: number
}

export interface AIGuardVitePluginOptions {
  /**
   * 是否启用自动上报功能（fetch 拦截 + devServer 端点 + HTML 报告）。
   * 设为 true 后才会安装 fetch 拦截器并启动 devServer 端点；未启用时虚拟模块为空操作，不会报错。
   * @default false
   */
  reporting?: boolean
  /**
   * 报告文件输出路径，相对于项目根目录。
   * @default 'ai-request-guard-report.html'
   */
  outFile?: string
  /**
   * 拦截的 HTTP 方法，只有请求方法在此列表中时才会上报 raw 数据。
   * 建议只填查询类接口使用的方法，增删改接口不需要拦截。
   * @default ['GET']
   */
  methods?: string[]
  /**
   * AI provider 配置，配置后启用 /__ai-guard GUI 管理界面（仅 dev 环境）。
   */
  ai?: AIGuardAIOptions
  /**
   * 生成文件的扩展名。
   * @default 'ts'
   */
  fileType?: 'ts' | 'js'
  /**
   * GUI 管理界面端口。不填时自动取 devServer 端口 + 1（如有冲突则继续 +1 探测）。
   */
  guiPort?: number
}

const VIRTUAL_MODULE_ID = 'virtual:ai-request-guard/report-sink'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_MODULE_ID

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 生成自包含 HTML 报告（内联 CSS，无外部依赖，双击浏览器直接打开） */
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

/**
 * AIRequestGuard Vite 插件。
 *
 * 功能：
 * 1. `/__ai-guard/report` POST — 接收浏览器上报的 schema diff 数据，更新报告
 * 2. `/__ai-guard/raw` POST — 接收真实 GET 请求拦截的 raw 数据快照，丰富报告中的 URL + 原始字段列
 * 3. 提供虚拟模块 `virtual:ai-request-guard/report-sink`，导入后自动安装 fetch 拦截器并在页面卸载时批量上报
 *
 * @example
 * // vite.config.ts
 * import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'
 * export default { plugins: [aiRequestGuardPlugin()] }
 *
 * // main.ts
 * import 'virtual:ai-request-guard/report-sink'
 * AIRequestGuard.watch('/api/user/detail', 'user-detail')
 */
export function aiRequestGuardPlugin(options: AIGuardVitePluginOptions = {}): Plugin {
  const reporting = options.reporting ?? false
  const outFile = options.outFile ?? 'ai-request-guard-report.html'
  const allowedMethods = (options.methods ?? ['GET']).map((m) => m.toUpperCase())
  const fileType = options.fileType ?? 'ts'
  const aiOpts = options.ai

  /** Build AIProvider from options, or null if not configured */
  function buildProvider(): AIProvider | null {
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

  /** schema diff 记录，按 adapter id 去重 */
  const records = new Map<string, SchemaDiff>()
  /** raw 数据快照，按 adapter id 去重 */
  const rawRecords = new Map<string, RawRecord>()

  let rootDir = process.cwd()

  function writeReport(): void {
    const list = Array.from(records.values())
    const html = generateReport(list, rawRecords)
    writeFileSync(resolve(rootDir, outFile), html, 'utf-8')
  }

  /** 读取 POST body，返回 Promise<string> */
  function readBody(req: import('http').IncomingMessage): Promise<string> {
    const MAX = 1024 * 1024
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString()
        if (body.length > MAX) { req.destroy(); reject(new Error('Body too large')) }
      })
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })
  }

  return {
    name: 'ai-request-guard',

    configResolved(config) {
      rootDir = config.root
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
    },

    /**
     * 虚拟模块：浏览器端 fetch 拦截器 + diff 上报。
     *
     * 导入后自动：
     * - 拦截 window.fetch（仅 GET），把 raw data 发到 /__ai-guard/raw
     * - 页面 visibilitychange / beforeunload 时把内存 diff 记录发到 /__ai-guard/report
     *
     * 也暴露 flushReport() 供手动触发。
     */
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return
      // When reporting is disabled, the virtual module is a no-op so apps that import it don't break.
      if (!reporting) return `export function flushReport() {}`
      const methodsJson = JSON.stringify(allowedMethods)
      return `
import { getDiffRecords } from '@ai-request-guard/core'

const ALLOWED_METHODS = ${methodsJson}
const _originalFetch = window.fetch.bind(window)

window.fetch = async function(input, init) {
  const method = ((init && init.method) || 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const response = await _originalFetch(input, init)
  if (!ALLOWED_METHODS.includes(method)) return response
  // 只上报已匹配（由 interceptor.ts 登记）的接口
  // 复用 sendBeacon，clone 不阻塞原始消费
  response.clone().json().then(raw => {
    const payload = JSON.stringify({ url, method, raw })
    navigator.sendBeacon('/__ai-guard/raw', new Blob([payload], { type: 'application/json' }))
  }).catch(() => {})
  return response
}

function flushReport() {
  const records = getDiffRecords()
  if (!records.length) return
  navigator.sendBeacon('/__ai-guard/report', new Blob([JSON.stringify(records)], { type: 'application/json' }))
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushReport()
})
window.addEventListener('beforeunload', flushReport)

export { flushReport }
`
    },

    configureServer(server: ViteDevServer) {
      // 启动独立端口的 GUI server（同进程，devServer 关闭时自动退出）
      if (aiOpts) {
        const devServerPort = Number(server.config.server.port) || 5173
        const host = 'localhost'

        startGuiServer({
          devServerPort,
          guiPort: options.guiPort,
          aiConfigured: true,
          fileType,
          rootDir,
          buildProvider,
          onLog: (msg) => server.config.logger.info(msg, { timestamp: true }),
        }).then(({ server: guiServer, port: guiPort }) => {
          server.config.logger.info(
            `  \x1b[32m➜\x1b[0m  AIRequestGuard GUI:  \x1b[36mhttp://${host}:${guiPort}\x1b[0m`,
            { timestamp: false }
          )
          server.httpServer?.once('close', () => guiServer.close())
        }).catch((err) => {
          server.config.logger.warn(`[ai-request-guard] GUI server failed to start: ${err}`, { timestamp: true })
        })
      }

      if (!reporting) return

      // ── /__ai-guard/report：接收 schema diff 上报 ──────────────────────────
      server.middlewares.use('/__ai-guard/report', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readBody(req)
        try {
          const incoming: SchemaDiff[] = JSON.parse(body)
          for (const diff of incoming) records.set(diff.id, diff)
          writeReport()
          server.config.logger.info(
            `[ai-request-guard] diff report updated → ${outFile} (${records.size} interfaces)`,
            { timestamp: true }
          )
        } catch { /* malformed — ignore */ }
        res.writeHead(204).end()
      })

      // ── /__ai-guard/raw：接收真实请求 raw 数据快照 ─────────────────────────
      server.middlewares.use('/__ai-guard/raw', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }
        const body = await readBody(req)
        try {
          const { url, raw } = JSON.parse(body) as { url: string; method: string; raw: unknown }
          if (typeof raw === 'object' && raw !== null) {
            // 找到该 url 对应的已注册 diff 记录（通过 url 路径匹配 id，简单包含匹配）
            const matchedId = findIdByUrl(url, records)
            if (matchedId) {
              rawRecords.set(matchedId, {
                id: matchedId,
                url,
                rawKeys: Object.keys(raw as Record<string, unknown>),
                capturedAt: new Date().toLocaleTimeString(),
              })
              writeReport()
              server.config.logger.info(
                `[ai-request-guard] raw captured: ${matchedId} ← ${url}`,
                { timestamp: true }
              )
            }
          }
        } catch { /* malformed — ignore */ }
        res.writeHead(204).end()
      })
    },
  }
}

/**
 * 根据 url 路径在已有 diff 记录中查找最可能匹配的 adapter id。
 * 策略：取 url pathname 的最后一段路径片段，在所有已知 id 中做包含匹配。
 */
function findIdByUrl(url: string, records: Map<string, SchemaDiff>): string | undefined {
  try {
    // 兼容相对路径（/api/user）和绝对路径（http://...）
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]
    // 优先精确包含匹配
    for (const id of records.keys()) {
      if (pathname.includes(id)) return id
    }
    // 次优：pathname 片段 vs id 片段互相包含
    const segments = pathname.split('/').filter(Boolean)
    for (const id of records.keys()) {
      const idSegments = id.split(/[-/]/)
      if (idSegments.some((seg) => segments.includes(seg))) return id
    }
  } catch { /* invalid url */ }
  return undefined
}
