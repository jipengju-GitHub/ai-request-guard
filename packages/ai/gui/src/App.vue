<script setup lang="ts">
import { inject, ref } from 'vue'

interface GuiConfig { aiConfigured: boolean; adaptersDir: string; fileType: string }
const config = inject<GuiConfig>('guiConfig')!

const adapterId = ref('')
const mockText = ref('')
const rawText = ref('')

const status = ref('')
const statusType = ref<'ok' | 'err' | 'info'>('info')
const resultVisible = ref(false)
const codeLines = ref<{ text: string; cls: string }[]>([])
const warnings = ref<string[]>([])
const targetPath = ref('')
const confirmVisible = ref(false)
const confirmPath = ref('')

let lastCode = ''
let lastAdapterId = ''

function setStatus(msg: string, type: 'ok' | 'err' | 'info') {
  status.value = msg
  statusType.value = type
}

function renderLines(code: string) {
  return code.split('\n').map(line => {
    if (line.includes('// ✅')) return { text: line, cls: 'conf-high' }
    if (line.includes('// ❓')) return { text: line, cls: 'conf-mid' }
    if (line.includes('// ❌')) return { text: line, cls: 'conf-low' }
    return { text: line, cls: '' }
  })
}

function fileName(id: string) {
  return id.replace(/[^a-zA-Z0-9-_]/g, '-') + '.' + config.fileType
}

async function generate() {
  if (!adapterId.value.trim()) { setStatus('请填写 Adapter ID', 'err'); return }
  if (!mockText.value.trim()) { setStatus('请填写 Mock JSON', 'err'); return }
  if (!rawText.value.trim()) { setStatus('请填写 Raw JSON', 'err'); return }

  let mock: unknown, raw: unknown
  try { mock = JSON.parse(mockText.value) } catch { setStatus('Mock JSON 格式错误', 'err'); return }
  try { raw = JSON.parse(rawText.value) } catch { setStatus('Raw JSON 格式错误', 'err'); return }

  setStatus('生成中...', 'info')

  try {
    const resp = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adapterId.value, mock, raw }),
    })
    const data = await resp.json()
    if (!resp.ok) { setStatus('生成失败：' + (data.error || resp.status), 'err'); return }

    lastCode = data.code
    lastAdapterId = adapterId.value
    codeLines.value = renderLines(data.code)
    warnings.value = data.warnings ?? []
    targetPath.value = config.adaptersDir.replace(/\\/g, '/') + '/' + fileName(adapterId.value)
    resultVisible.value = true
    setStatus('生成完成', 'ok')
  } catch (e: any) {
    setStatus('请求失败：' + e.message, 'err')
  }
}

function copyCode() {
  if (!lastCode) return
  navigator.clipboard.writeText(lastCode).then(() => setStatus('已复制到剪贴板', 'ok'))
}

function showConfirm() {
  if (!lastAdapterId) return
  confirmPath.value = config.adaptersDir.replace(/\\/g, '/') + '/' + fileName(lastAdapterId)
  confirmVisible.value = true
}

async function confirmWrite() {
  confirmVisible.value = false
  setStatus('写入中...', 'info')
  try {
    const resp = await fetch('/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lastAdapterId, code: lastCode }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      setStatus('写入失败：' + (data.error || resp.status), 'err')
    } else {
      setStatus('写入成功：' + data.path, 'ok')
    }
  } catch {
    setStatus('写入请求失败，请手动复制代码。', 'err')
  }
}
</script>

<template>
  <div class="page">
    <h1>AIRequestGuard — Adapter Generator</h1>
    <p class="sub">开发期 adapter 自动生成工具，生产构建时此页面不存在。</p>

    <div v-if="!config.aiConfigured" class="warn-banner">
      ⚠ 未配置 AI provider。请在插件配置中添加 <code>ai.apiKey</code> 后重启 dev 服务。
    </div>

    <div class="form-row">
      <div class="form-group id-group">
        <label>Adapter ID</label>
        <input v-model="adapterId" type="text" placeholder="例如: user-detail" autocomplete="off" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Mock JSON（前端期望的数据结构）</label>
        <textarea v-model="mockText" placeholder='{"userName":"张三","mobile":"138xxxxxxxx","age":28}' />
      </div>
      <div class="form-group">
        <label>Raw JSON（后端真实返回数据）</label>
        <textarea v-model="rawText" placeholder='{"username":"张三","phone_no":"138xxxxxxxx","age":"28"}' />
      </div>
    </div>

    <div class="actions">
      <button class="btn-primary" :disabled="!config.aiConfigured" @click="generate">生成 Adapter</button>
    </div>

    <div :class="['status', 'status-' + statusType]">{{ status }}</div>

    <div v-if="resultVisible" class="result-section">
      <h2>生成结果</h2>
      <div class="result-box">
        <pre><template v-for="(l, i) in codeLines" :key="i"><span :class="l.cls || undefined">{{ l.text }}</span>{{ '\n' }}</template></pre>
        <ul class="warning-list">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
      <div class="result-actions">
        <button class="btn-copy" @click="copyCode">复制代码</button>
        <button class="btn-write" @click="showConfirm">写入文件</button>
        <span class="target-path">{{ targetPath }}</span>
      </div>
      <div v-if="confirmVisible" class="write-confirm">
        <span>确认写入路径：</span><strong>{{ confirmPath }}</strong>
        <div class="write-confirm-actions">
          <button class="btn-confirm" @click="confirmWrite">确认写入</button>
          <button class="btn-cancel" @click="confirmVisible = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 32px; }
</style>

<style scoped>
.page { max-width: 960px; margin: 0 auto; }
h1 { color: #58a6ff; font-size: 20px; margin-bottom: 4px; }
.sub { color: #8b949e; font-size: 12px; margin-bottom: 28px; }
.warn-banner { background: rgba(240,136,62,.12); border: 1px solid #f0883e; border-radius: 6px; padding: 12px 16px; color: #f0883e; font-size: 13px; margin-bottom: 20px; }
.form-row { display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-start; }
.form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.form-group.id-group { max-width: 280px; }
label { font-size: 12px; color: #8b949e; }
input, textarea { background: #161b22; border: 1px solid #30363d; color: #c9d1d9; border-radius: 6px; padding: 8px 12px; font-size: 13px; font-family: monospace; width: 100%; outline: none; resize: vertical; }
textarea { min-height: 140px; }
input:focus, textarea:focus { border-color: #58a6ff; }
.actions { display: flex; gap: 10px; margin-top: 4px; }
button { padding: 8px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
.btn-primary { background: #238636; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #2ea043; }
.btn-primary:disabled { background: #21262d; color: #484f58; cursor: not-allowed; }
.btn-copy { background: #1f6feb; color: #fff; }
.btn-copy:hover { background: #388bfd; }
.btn-write { background: #161b22; color: #58a6ff; border: 1px solid #30363d; }
.btn-write:hover { border-color: #58a6ff; }
.status { margin-top: 12px; font-size: 13px; min-height: 20px; }
.status-ok { color: #3fb950; }
.status-err { color: #f85149; }
.status-info { color: #8b949e; }
.result-section { margin-top: 24px; }
.result-section h2 { font-size: 15px; color: #c9d1d9; margin-bottom: 10px; }
.result-box { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; }
pre { font-family: monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; color: #e6edf3; }
.conf-high { color: #3fb950; }
.conf-mid { color: #f0883e; }
.conf-low { color: #f85149; }
.warning-list { margin-top: 12px; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.warning-list li { font-size: 12px; color: #f0883e; background: rgba(240,136,62,.1); border-left: 3px solid #f0883e; padding: 5px 10px; border-radius: 3px; }
.result-actions { display: flex; gap: 10px; margin-top: 10px; align-items: center; }
.target-path { font-size: 12px; color: #8b949e; }
.write-confirm { margin-top: 10px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 12px 16px; font-size: 13px; }
.write-confirm span { color: #8b949e; }
.write-confirm strong { color: #c9d1d9; }
.write-confirm-actions { display: flex; gap: 8px; margin-top: 10px; }
.btn-confirm { background: #b62324; color: #fff; padding: 6px 14px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; }
.btn-cancel { background: #21262d; color: #c9d1d9; padding: 6px 14px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; }
</style>
