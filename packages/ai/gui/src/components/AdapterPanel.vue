<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  config: { aiConfigured: boolean; adaptersDir: string; fileType: string }
}>()

const adapterId = ref('')
const mockText = ref('')
const rawText = ref('')
const error = ref('')
const loading = ref(false)
const result = ref<{ code: string; confidence: number; notes: string } | null>(null)
const writeState = ref<'idle' | 'confirm' | 'writing' | 'done' | 'error'>('idle')
const writePath = ref('')
const writeError = ref('')

const confidenceColor = computed(() => {
  if (!result.value) return ''
  const c = result.value.confidence
  if (c >= 0.8) return 'var(--green)'
  if (c >= 0.5) return 'var(--amber)'
  return 'var(--red)'
})

const confidenceLabel = computed(() => {
  if (!result.value) return ''
  const c = result.value.confidence
  if (c >= 0.8) return '高'
  if (c >= 0.5) return '中'
  return '低'
})

async function generate() {
  error.value = ''
  result.value = null
  writeState.value = 'idle'

  if (!adapterId.value.trim()) { error.value = '请填写 Adapter ID'; return }
  let mock: unknown, raw: unknown
  function looseParse(text: string, label: string): unknown {
    try { return JSON.parse(text) } catch { /* try JS eval */ }
    try { return new Function('return (' + text + ')')() } catch {
      error.value = label + ' 格式错误，请检查括号/引号是否匹配'
      return undefined
    }
  }
  mock = looseParse(mockText.value, 'Mock')
  if (error.value) return
  raw = looseParse(rawText.value, 'Raw')
  if (error.value) return
  if (typeof mock !== 'object' || mock === null || Array.isArray(mock)) { error.value = 'Mock 须为 JSON 对象'; return }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) { error.value = 'Raw 须为 JSON 对象'; return }

  loading.value = true
  try {
    const resp = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adapterId.value.trim(), mock, raw }),
    })
    const data = await resp.json()
    if (!resp.ok) { error.value = data.error || '生成失败'; return }
    result.value = data
  } catch (e: any) {
    error.value = '请求失败：' + e.message
  } finally {
    loading.value = false
  }
}

function copyCode() {
  if (!result.value) return
  navigator.clipboard.writeText(result.value.code).then(() => {
    const btn = document.getElementById('copy-code-btn')
    if (btn) { btn.textContent = '已复制'; setTimeout(() => { btn.textContent = '复制代码' }, 1800) }
  })
}

async function writeFile() {
  if (!result.value) return
  writeState.value = 'writing'
  writeError.value = ''
  try {
    const resp = await fetch('/write-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: adapterId.value.trim(), code: result.value.code }),
    })
    const data = await resp.json()
    if (!resp.ok) { writeState.value = 'error'; writeError.value = data.error || '写入失败'; return }
    writePath.value = data.path
    writeState.value = 'done'
  } catch (e: any) {
    writeState.value = 'error'
    writeError.value = '请求失败：' + e.message
  }
}
</script>

<template>
  <div class="adapter-panel">
    <div class="page-head">
      <div>
        <h2 class="page-title">Adapter 生成</h2>
        <p class="page-desc">填写 Mock（期望输出）和 Raw（后端原始数据），AI 自动生成映射函数。</p>
      </div>
      <div v-if="!config.aiConfigured" class="ai-warn-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        未配置 AI，请在插件选项中设置 <code>ai.apiKey</code>
      </div>
    </div>

    <!-- Row 1: ID + error -->
    <div class="card id-card">
      <div class="id-row">
        <label class="id-label">Adapter ID</label>
        <input
          v-model="adapterId"
          class="id-input"
          placeholder="例如：user-profile、order-detail"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Row 2: Mock + Raw -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-label">Mock JSON</span>
          <span class="card-hint">前端期望的 ViewModel</span>
        </div>
        <textarea
          v-model="mockText"
          class="code-area"
          rows="14"
          placeholder='{"userName":"张三","mobile":"138xxxxxxxx","age":28}'
          spellcheck="false"
        />
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-label">Raw JSON</span>
          <span class="card-hint">后端返回的原始数据</span>
        </div>
        <textarea
          v-model="rawText"
          class="code-area"
          rows="14"
          placeholder='{"user_name":"张三","phone":"138xxxxxxxx","user_age":28}'
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Action row -->
    <div class="action-row">
      <div class="err-msg" v-if="error">{{ error }}</div>
      <div v-else class="spacer" />
      <button
        class="btn-primary"
        :disabled="loading || !config.aiConfigured || !adapterId.trim() || !mockText.trim() || !rawText.trim()"
        @click="generate"
      >
        <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        {{ loading ? '生成中...' : 'AI 生成 Adapter' }}
      </button>
    </div>

    <!-- Result -->
    <div v-if="result" class="card result-card">
      <div class="card-header">
        <div class="result-meta">
          <span class="card-label">生成结果</span>
          <span class="confidence-badge" :style="{ color: confidenceColor, borderColor: confidenceColor + '44', background: confidenceColor + '14' }">
            置信度 {{ confidenceLabel }} {{ Math.round(result.confidence * 100) }}%
          </span>
        </div>
        <div class="result-actions">
          <button id="copy-code-btn" class="btn-ghost" @click="copyCode">复制代码</button>
          <button
            v-if="writeState === 'idle' || writeState === 'error'"
            class="btn-ghost btn-write"
            @click="writeState = 'confirm'"
          >
            写入文件
          </button>
        </div>
      </div>

      <pre class="code-area result-code">{{ result.code }}</pre>

      <template v-if="result.notes">
        <div class="card-divider" />
        <div class="notes-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>{{ result.notes }}</span>
        </div>
      </template>

      <!-- Confirm write -->
      <template v-if="writeState === 'confirm'">
        <div class="card-divider" />
        <div class="confirm-row">
          <span class="confirm-text">
            将写入 <code>{{ config.adaptersDir }}/{{ adapterId.trim().replace(/[^a-zA-Z0-9-_]/g, '-') }}.{{ config.fileType }}</code>，确认？
          </span>
          <div class="confirm-btns">
            <button class="btn-ghost" @click="writeState = 'idle'">取消</button>
            <button class="btn-primary btn-sm" @click="writeFile">确认写入</button>
          </div>
        </div>
      </template>

      <!-- Writing -->
      <template v-if="writeState === 'writing'">
        <div class="card-divider" />
        <div class="status-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          写入中…
        </div>
      </template>

      <!-- Done -->
      <template v-if="writeState === 'done'">
        <div class="card-divider" />
        <div class="status-row success">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          已写入 <code>{{ writePath }}</code>
        </div>
      </template>

      <!-- Write error -->
      <template v-if="writeState === 'error'">
        <div class="card-divider" />
        <div class="status-row fail">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          {{ writeError }}
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.adapter-panel { display: flex; flex-direction: column; gap: 16px; }

.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.page-desc { font-size: 13px; color: var(--text-muted); }

.ai-warn-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: var(--radius);
  padding: 9px 14px;
  font-size: 12px;
  color: var(--amber);
  white-space: nowrap;
  flex-shrink: 0;
}
.ai-warn-banner code { font-family: 'Cascadia Code', monospace; font-size: 11px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.id-card { padding: 0; }
.id-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
.id-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .6px; white-space: nowrap; }
.id-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-sub);
  border-radius: var(--radius);
  color: var(--text);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
  padding: 7px 12px;
  outline: none;
  transition: border-color .15s;
}
.id-input:focus { border-color: rgba(124,124,255,.5); }
.id-input::placeholder { color: var(--text-faint); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.card-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .6px; }
.card-hint { font-size: 12px; color: var(--text-faint); }
.card-divider { height: 1px; background: var(--border); margin: 0 16px; flex-shrink: 0; }

.code-area {
  flex: 1;
  background: var(--bg-input);
  border: none;
  outline: none;
  color: var(--text);
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.75;
  padding: 14px 16px;
  resize: none;
  width: 100%;
}
.result-code { white-space: pre; overflow: auto; min-height: 160px; }

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.spacer { flex: 1; }
.err-msg { flex: 1; font-size: 12px; color: var(--red); }

.result-card { }
.result-meta { display: flex; align-items: center; gap: 10px; }
.result-actions { display: flex; align-items: center; gap: 8px; }

.confidence-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 20px;
  border: 1px solid;
}

.notes-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}
.notes-row svg { flex-shrink: 0; margin-top: 1px; color: var(--text-faint); }

.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  flex-wrap: wrap;
}
.confirm-text { font-size: 12px; color: var(--text-muted); }
.confirm-text code { font-family: 'Cascadia Code', monospace; font-size: 11px; color: var(--accent); }
.confirm-btns { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-muted);
}
.status-row.success { color: var(--green); }
.status-row.fail { color: var(--red); }
.status-row code { font-family: 'Cascadia Code', monospace; font-size: 11px; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  flex-shrink: 0;
}
.btn-primary.btn-sm { padding: 5px 12px; font-size: 12px; }
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-primary:active:not(:disabled) { transform: translateY(1px); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-sub);
  color: var(--text-muted);
  border-radius: var(--radius);
  padding: 4px 12px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: color .15s, border-color .15s;
}
.btn-ghost:hover { color: var(--accent); border-color: rgba(124,124,255,.4); }
.btn-write { }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }
</style>
