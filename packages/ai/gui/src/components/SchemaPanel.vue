<script setup lang="ts">
import { ref } from 'vue'

const mockText = ref('')
const schema = ref<Record<string, unknown> | null>(null)
const error = ref('')
const loading = ref(false)

async function infer() {
  error.value = ''
  schema.value = null
  let mock: unknown
  try { mock = JSON.parse(mockText.value) } catch { error.value = 'Mock JSON 格式错误'; return }
  if (typeof mock !== 'object' || mock === null || Array.isArray(mock)) {
    error.value = 'Mock 数据须为 JSON 对象'
    return
  }
  loading.value = true
  try {
    const resp = await fetch('/infer-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mock }),
    })
    const data = await resp.json()
    if (!resp.ok) { error.value = data.error || '推导失败'; return }
    schema.value = data.schema
  } catch (e: any) {
    error.value = '请求失败：' + e.message
  } finally {
    loading.value = false
  }
}

function copySchema() {
  if (!schema.value) return
  navigator.clipboard.writeText(JSON.stringify(schema.value, null, 2))
    .then(() => {
      const btn = document.getElementById('copy-schema-btn')
      if (btn) { btn.textContent = '已复制'; setTimeout(() => { btn.textContent = '复制 Schema' }, 1800) }
    })
}
</script>

<template>
  <div class="schema-panel">
    <div class="page-head">
      <div>
        <h2 class="page-title">Schema 推导</h2>
        <p class="page-desc">从 Mock 数据本地推导 Schema 结构，无需 AI，即时完成。</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- 左：输入 -->
      <div class="card">
        <div class="card-header">
          <span class="card-label">Mock JSON</span>
          <span class="card-hint">前端期望的数据结构</span>
        </div>
        <textarea
          v-model="mockText"
          class="code-area"
          rows="16"
          placeholder='{"userName":"张三","mobile":"138xxxxxxxx","age":28,"dept":{"id":1,"name":"研发部"}}'
          spellcheck="false"
        />
        <div class="card-footer">
          <div class="err-msg" v-if="error">{{ error }}</div>
          <button class="btn-primary" :disabled="loading || !mockText.trim()" @click="infer">
            <svg v-if="!loading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            {{ loading ? '推导中...' : '推导 Schema' }}
          </button>
        </div>
      </div>

      <!-- 右：结果 -->
      <div class="card">
        <div class="card-header">
          <span class="card-label">推导结果</span>
          <button v-if="schema" id="copy-schema-btn" class="btn-ghost" @click="copySchema">复制 Schema</button>
        </div>
        <div v-if="schema" class="code-area result-area">{{ JSON.stringify(schema, null, 2) }}</div>
        <div v-else class="empty-state">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <span>输入 Mock JSON 后点击推导</span>
        </div>

        <template v-if="schema">
          <div class="card-divider" />
          <div class="schema-tips">
            <div class="tip-title">字段说明</div>
            <div class="tip-row"><span class="tip-val str">""</span><span>字符串字段</span></div>
            <div class="tip-row"><span class="tip-val num">0</span><span>数字字段</span></div>
            <div class="tip-row"><span class="tip-val bool">false</span><span>布尔字段</span></div>
            <div class="tip-row"><span class="tip-val nil">null</span><span>null / 未知类型</span></div>
            <div class="tip-row"><span class="tip-val arr">[ ]</span><span>数组，取首元素类型</span></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-panel { display: flex; flex-direction: column; gap: 24px; }

.page-head { display: flex; align-items: flex-start; justify-content: space-between; }
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
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.card-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .6px; }
.card-hint { font-size: 12px; color: var(--text-faint); }
.card-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-divider { height: 1px; background: var(--border); margin: 0 16px; }

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
  transition: color .2s;
}
.result-area { white-space: pre; overflow: auto; min-height: 200px; }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-faint);
  font-size: 12px;
  min-height: 200px;
}

.err-msg { font-size: 12px; color: var(--red); }

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

.schema-tips { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.tip-title { font-size: 11px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px; }
.tip-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-muted); }
.tip-val {
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 4px;
  min-width: 44px;
  text-align: center;
}
.tip-val.str  { background: rgba(124,124,255,.1); color: var(--accent); }
.tip-val.num  { background: rgba(34,197,94,.1);   color: var(--green); }
.tip-val.bool { background: rgba(245,158,11,.1);  color: var(--amber); }
.tip-val.nil  { background: rgba(148,163,184,.1); color: var(--slate); }
.tip-val.arr  { background: rgba(248,113,113,.1); color: var(--red); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }
</style>
