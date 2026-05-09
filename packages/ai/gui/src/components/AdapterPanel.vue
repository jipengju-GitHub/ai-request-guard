<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  config: { aiConfigured: boolean; fileType: string }
}>()

const adapterId = ref('')
const mockText = ref('')
const rawText = ref('')
const error = ref('')
const loading = ref(false)
const result = ref<{ code: string; confidence: number; notes: string } | null>(null)

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

function looseParse(text: string, label: string): unknown {
  try { return JSON.parse(text) } catch { /* try JS literal */ }
  try { return new Function('return (' + text + ')')() } catch {
    error.value = label + ' 格式错误，请检查括号/引号是否匹配'
    return undefined
  }
}

async function generate() {
  error.value = ''
  result.value = null

  if (!adapterId.value.trim()) { error.value = '请填写 Adapter ID'; return }

  const mock = looseParse(mockText.value, 'Mock')
  if (error.value) return
  const raw = looseParse(rawText.value, 'Raw')
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
</script>

<template>
  <div class="adapter-panel">
    <div class="page-head">
      <div>
        <h2 class="page-title">Adapter 生成</h2>
        <p class="page-desc">填写 Mock（期望 ViewModel）和 Raw（后端原始数据），生成映射函数，复制后粘贴到项目中。</p>
      </div>
    </div>

    <!-- ID -->
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

    <!-- Mock + Raw -->
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

    <!-- Action -->
    <div class="action-row">
      <div class="err-msg" v-if="error">{{ error }}</div>
      <div v-else class="spacer" />
      <div class="btn-group">
        <button
          class="btn-secondary"
          disabled
          title="AI 自动生成（即将推出）"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          AI 自动生成
          <span class="btn-badge">即将推出</span>
        </button>
        <button
          class="btn-primary"
          :disabled="loading || !adapterId.trim() || !mockText.trim() || !rawText.trim()"
          @click="generate"
        >
          <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ loading ? '生成中...' : '手动生成' }}
        </button>
      </div>
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
        <button id="copy-code-btn" class="btn-ghost" @click="copyCode">复制代码</button>
      </div>

      <pre class="code-area result-code">{{ result.code }}</pre>

      <template v-if="result.notes">
        <div class="card-divider" />
        <div class="notes-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>{{ result.notes }}</span>
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

.btn-group { display: flex; align-items: center; gap: 8px; }

.result-card { }
.result-meta { display: flex; align-items: center; gap: 10px; }

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
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-primary:active:not(:disabled) { transform: translateY(1px); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--bg-raised);
  color: var(--text-muted);
  border: 1px solid var(--border-sub);
  border-radius: var(--radius);
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: not-allowed;
  opacity: .45;
  flex-shrink: 0;
}

.btn-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 20px;
  background: var(--amber-dim);
  color: var(--amber);
  border: 1px solid rgba(245,158,11,.2);
  font-weight: 500;
}

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

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }
</style>
