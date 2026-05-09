import type { SchemaDiff } from './schema'

/** 运行时收集的所有接口 diff 记录 */
const _records: SchemaDiff[] = []

let _flushTimer: ReturnType<typeof setTimeout> | null = null

function flushToServer(): void {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return
  if (!_records.length) return
  navigator.sendBeacon(
    '/__ai-guard/report',
    new Blob([JSON.stringify(_records)], { type: 'application/json' })
  )
}

function scheduleFlush(): void {
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = setTimeout(flushToServer, 500)
}

/**
 * 收集单次请求的 schema diff，追加到内存报告队列。
 * 仅在 dev 构建中有效，生产构建会被 tree-shake。
 *
 * @param diff validateSchema 返回的差异对象
 */
export function reportDiff(diff: SchemaDiff): void {
  // 同一 id 合并：用最新一次结果覆盖，避免重复按钮点击产生冗余条目
  const idx = _records.findIndex((r) => r.id === diff.id)
  if (idx === -1) {
    _records.push(diff)
  } else {
    _records[idx] = diff
  }
  scheduleFlush()
}

/**
 * 返回当前内存中所有收集到的 diff 记录（快照副本）。
 */
export function getDiffRecords(): SchemaDiff[] {
  return _records.slice()
}

/**
 * 清空内存中的所有 diff 记录。
 */
export function clearDiffRecords(): void {
  _records.length = 0
}

/**
 * 生成自包含的 HTML 报告字符串（内联 CSS + JS，双击浏览器直接打开）。
 *
 * 报告内容：
 * - 汇总表：接口 ID、缺失字段数、类型不匹配数、多余字段数
 * - 详情区：每个有差异的接口展示字段级别的差异条目
 *
 * @param records 要渲染的 diff 记录，默认取当前内存中全部记录
 */
export function generateReport(records: SchemaDiff[] = _records): string {
  const now = new Date().toLocaleString()
  const total = records.length
  const hasDiffCount = records.filter(
    (r) => r.missingFields.length > 0 || r.typeMismatches.length > 0
  ).length

  const rowsHtml = records
    .map((r) => {
      const hasProblem = r.missingFields.length > 0 || r.typeMismatches.length > 0
      const statusIcon = hasProblem ? '⚠' : '✓'
      const statusClass = hasProblem ? 'warn' : 'ok'
      return `<tr class="${statusClass}">
        <td><span class="status-icon">${statusIcon}</span> ${escHtml(r.id)}</td>
        <td>${r.missingFields.length}</td>
        <td>${r.typeMismatches.length}</td>
        <td>${r.extraFields.length}</td>
      </tr>`
    })
    .join('\n')

  const detailsHtml = records
    .filter((r) => r.missingFields.length > 0 || r.typeMismatches.length > 0)
    .map((r) => {
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
        <summary><strong>${escHtml(r.id)}</strong></summary>
        <ul>${missing}${mismatches}</ul>
      </details>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AIRequestGuard — Schema Diff Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 32px; }
  h1 { color: #58a6ff; font-size: 20px; margin-bottom: 4px; }
  .meta { color: #8b949e; font-size: 12px; margin-bottom: 24px; }
  .summary-bar { display: flex; gap: 16px; margin-bottom: 24px; }
  .badge { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 12px 20px; }
  .badge .num { font-size: 28px; font-weight: 700; color: #58a6ff; }
  .badge .lbl { font-size: 12px; color: #8b949e; margin-top: 2px; }
  .badge.warn .num { color: #f0883e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; border-bottom: 1px solid #30363d; color: #8b949e; font-weight: normal; }
  td { padding: 8px 12px; border-bottom: 1px solid #21262d; }
  tr.warn td { color: #f0883e; }
  tr.ok td { color: #3fb950; }
  .status-icon { font-size: 14px; }
  details { background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 12px; padding: 12px 16px; }
  summary { cursor: pointer; font-size: 14px; color: #c9d1d9; padding: 2px 0; }
  summary:hover { color: #58a6ff; }
  ul { margin-top: 10px; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  li { font-size: 13px; padding: 6px 10px; border-radius: 4px; }
  li.missing { background: rgba(240,136,62,0.1); border-left: 3px solid #f0883e; }
  li.mismatch { background: rgba(248,81,73,0.1); border-left: 3px solid #f85149; }
  code { font-family: monospace; background: #0d1117; padding: 1px 5px; border-radius: 3px; }
  .empty { color: #8b949e; font-size: 13px; padding: 20px 0; text-align: center; }
</style>
</head>
<body>
<h1>AIRequestGuard — Schema Diff Report</h1>
<p class="meta">生成时间：${escHtml(now)} &nbsp;|&nbsp; 共 ${total} 个接口，${hasDiffCount} 个有差异</p>

<div class="summary-bar">
  <div class="badge${hasDiffCount > 0 ? ' warn' : ''}">
    <div class="num">${hasDiffCount}</div>
    <div class="lbl">有差异接口</div>
  </div>
  <div class="badge">
    <div class="num">${total}</div>
    <div class="lbl">已检测接口</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>接口 ID</th>
      <th>缺失字段</th>
      <th>类型不匹配</th>
      <th>多余字段</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml || '<tr><td colspan="4" class="empty">暂无记录</td></tr>'}
  </tbody>
</table>

${detailsHtml || '<p class="empty">所有接口 schema 均匹配，无差异 ✓</p>'}

</body>
</html>`
}

/** HTML 转义，防止接口 ID 或字段名中的特殊字符破坏报告结构 */
function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
