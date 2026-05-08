/** Builds the self-contained HTML string for the /__ai-guard GUI page. */
export function buildGuiHtml(opts: { aiConfigured: boolean; adaptersDir: string; fileType?: string }): string {
  const { aiConfigured, adaptersDir, fileType = 'ts' } = opts
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>AIRequestGuard — Adapter Generator</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d1117;color:#c9d1d9;padding:32px;max-width:960px;margin:0 auto}
h1{color:#58a6ff;font-size:20px;margin-bottom:4px}
.sub{color:#8b949e;font-size:12px;margin-bottom:28px}
.warn-banner{background:rgba(240,136,62,.12);border:1px solid #f0883e;border-radius:6px;padding:12px 16px;color:#f0883e;font-size:13px;margin-bottom:20px}
.form-row{display:flex;gap:16px;margin-bottom:16px;align-items:flex-start}
.form-group{display:flex;flex-direction:column;gap:6px;flex:1}
.form-group.id-group{max-width:280px}
label{font-size:12px;color:#8b949e}
input,textarea{background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:6px;padding:8px 12px;font-size:13px;font-family:monospace;width:100%;outline:none;resize:vertical}
input:focus,textarea:focus{border-color:#58a6ff}
textarea{min-height:140px}
.actions{display:flex;gap:10px;margin-top:4px}
button{padding:8px 20px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600}
.btn-primary{background:#238636;color:#fff}
.btn-primary:hover:not(:disabled){background:#2ea043}
.btn-primary:disabled{background:#21262d;color:#484f58;cursor:not-allowed}
.btn-copy{background:#1f6feb;color:#fff}
.btn-copy:hover{background:#388bfd}
.btn-write{background:#161b22;color:#58a6ff;border:1px solid #30363d}
.btn-write:hover:not(:disabled){border-color:#58a6ff}
.btn-write:disabled{color:#484f58;cursor:not-allowed;border-color:#21262d}
#result-section{margin-top:24px;display:none}
#result-section h2{font-size:15px;color:#c9d1d9;margin-bottom:10px}
.result-box{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:16px;position:relative}
pre{font-family:monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;color:#e6edf3}
.warning-list{margin-top:12px;list-style:none;display:flex;flex-direction:column;gap:6px}
.warning-list li{font-size:12px;color:#f0883e;background:rgba(240,136,62,.1);border-left:3px solid #f0883e;padding:5px 10px;border-radius:3px}
#write-confirm{display:none;margin-top:10px;background:#161b22;border:1px solid #30363d;border-radius:6px;padding:12px 16px;font-size:13px}
#write-confirm span{color:#8b949e}
#write-confirm strong{color:#c9d1d9}
.write-confirm-actions{display:flex;gap:8px;margin-top:10px}
.btn-confirm{background:#b62324;color:#fff;padding:6px 14px;border-radius:4px;border:none;cursor:pointer;font-size:12px}
.btn-cancel{background:#21262d;color:#c9d1d9;padding:6px 14px;border-radius:4px;border:none;cursor:pointer;font-size:12px}
#status{margin-top:12px;font-size:13px;min-height:20px}
.status-ok{color:#3fb950}
.status-err{color:#f85149}
.status-info{color:#8b949e}
/* confidence highlight */
.conf-high{color:#3fb950}
.conf-mid{color:#f0883e}
.conf-low{color:#f85149}
</style>
</head>
<body>
<h1>AIRequestGuard — Adapter Generator</h1>
<p class="sub">开发期 adapter 自动生成工具，生产构建时此页面不存在。</p>

${!aiConfigured ? `<div class="warn-banner">⚠ 未配置 AI provider。请在插件配置中添加 <code>ai.apiKey</code> 后重启 dev 服务。</div>` : ''}

<div class="form-row">
  <div class="form-group id-group">
    <label for="adapterId">Adapter ID</label>
    <input id="adapterId" type="text" placeholder="例如: user-detail" autocomplete="off"/>
  </div>
</div>
<div class="form-row">
  <div class="form-group">
    <label for="mockJson">Mock JSON（前端期望的数据结构）</label>
    <textarea id="mockJson" placeholder='{"userName":"张三","mobile":"138xxxxxxxx","age":28}'></textarea>
  </div>
  <div class="form-group">
    <label for="rawJson">Raw JSON（后端真实返回数据）</label>
    <textarea id="rawJson" placeholder='{"username":"张三","phone_no":"138xxxxxxxx","age":"28"}'></textarea>
  </div>
</div>
<div class="actions">
  <button class="btn-primary" id="generateBtn" ${!aiConfigured ? 'disabled' : ''}>生成 Adapter</button>
</div>
<div id="status"></div>

<div id="result-section">
  <h2>生成结果</h2>
  <div class="result-box">
    <pre id="codeOutput"></pre>
    <ul id="warningList" class="warning-list"></ul>
  </div>
  <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
    <button class="btn-copy" id="copyBtn">复制代码</button>
    <button class="btn-write" id="writeBtn">写入文件</button>
    <span style="font-size:12px;color:#8b949e" id="targetPath"></span>
  </div>
  <div id="write-confirm">
    <span>确认写入路径：</span><strong id="confirmPath"></strong>
    <div class="write-confirm-actions">
      <button class="btn-confirm" id="confirmWriteBtn">确认写入</button>
      <button class="btn-cancel" id="cancelWriteBtn">取消</button>
    </div>
  </div>
</div>

<script>
const ADAPTERS_DIR = ${JSON.stringify(adaptersDir)}
const FILE_TYPE = ${JSON.stringify(fileType)}
let lastCode = ''
let lastAdapterId = ''

function setStatus(msg, type) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.className = 'status-' + type
}

function highlightCode(code) {
  return code
    .replace(/\/\/ ✅[^\n]*/g, m => '<span class="conf-high">' + escHtml(m) + '</span>')
    .replace(/\/\/ ❓[^\n]*/g, m => '<span class="conf-mid">' + escHtml(m) + '</span>')
    .replace(/\/\/ ❌[^\n]*/g, m => '<span class="conf-low">' + escHtml(m) + '</span>')
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function renderCode(code) {
  // Highlight confidence lines, escape the rest
  const lines = code.split('\n')
  return lines.map(line => {
    if (line.includes('// ✅')) return '<span class="conf-high">' + escHtml(line) + '</span>'
    if (line.includes('// ❓')) return '<span class="conf-mid">' + escHtml(line) + '</span>'
    if (line.includes('// ❌')) return '<span class="conf-low">' + escHtml(line) + '</span>'
    return escHtml(line)
  }).join('\n')
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  const adapterId = document.getElementById('adapterId').value.trim()
  const mockText = document.getElementById('mockJson').value.trim()
  const rawText = document.getElementById('rawJson').value.trim()

  if (!adapterId) { setStatus('请填写 Adapter ID', 'err'); return }
  if (!mockText) { setStatus('请填写 Mock JSON', 'err'); return }
  if (!rawText) { setStatus('请填写 Raw JSON', 'err'); return }

  let mock, raw
  try { mock = JSON.parse(mockText) } catch { setStatus('Mock JSON 格式错误', 'err'); return }
  try { raw = JSON.parse(rawText) } catch { setStatus('Raw JSON 格式错误', 'err'); return }

  setStatus('生成中...', 'info')
  document.getElementById('generateBtn').disabled = true

  try {
    const resp = await fetch('/__ai-guard/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adapterId, mock, raw }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      setStatus('生成失败：' + (data.error || resp.status), 'err')
      return
    }
    lastCode = data.code
    lastAdapterId = adapterId

    document.getElementById('codeOutput').innerHTML = renderCode(data.code)
    const warnList = document.getElementById('warningList')
    warnList.innerHTML = ''
    if (data.warnings && data.warnings.length) {
      data.warnings.forEach(w => {
        const li = document.createElement('li')
        li.textContent = w
        warnList.appendChild(li)
      })
    }

    const fileName = adapterId.replace(/[^a-zA-Z0-9-_]/g, '-') + '.' + FILE_TYPE
    const targetPath = ADAPTERS_DIR.replace(/\\/g, '/') + '/' + fileName
    document.getElementById('targetPath').textContent = targetPath
    document.getElementById('result-section').style.display = 'block'
    setStatus('生成完成', 'ok')
  } catch (e) {
    setStatus('请求失败：' + e.message, 'err')
  } finally {
    document.getElementById('generateBtn').disabled = false
  }
})

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!lastCode) return
  navigator.clipboard.writeText(lastCode).then(() => setStatus('已复制到剪贴板', 'ok'))
})

document.getElementById('writeBtn').addEventListener('click', () => {
  if (!lastAdapterId) return
  const fileName = lastAdapterId.replace(/[^a-zA-Z0-9-_]/g, '-') + '.' + FILE_TYPE
  const targetPath = ADAPTERS_DIR.replace(/\\/g, '/') + '/' + fileName
  document.getElementById('confirmPath').textContent = targetPath
  document.getElementById('write-confirm').style.display = 'block'
})

document.getElementById('cancelWriteBtn').addEventListener('click', () => {
  document.getElementById('write-confirm').style.display = 'none'
})

document.getElementById('confirmWriteBtn').addEventListener('click', async () => {
  document.getElementById('write-confirm').style.display = 'none'
  setStatus('写入中...', 'info')
  try {
    const resp = await fetch('/__ai-guard/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lastAdapterId, code: lastCode }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      setStatus('写入失败：' + (data.error || resp.status), 'err')
    } else {
      setStatus('写入成功：' + data.path, 'ok')
      document.getElementById('writeBtn').disabled = true
    }
  } catch (e) {
    setStatus('写入请求失败，请手动复制代码。', 'err')
  }
})
</script>
</body>
</html>`
}
