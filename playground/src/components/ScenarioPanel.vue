<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Scenario } from '../scenarios'

const props = defineProps<{ scenario: Scenario }>()
const emit = defineEmits<{ run: [params: { raw: unknown; schema: unknown; mockData: unknown; mode: 'real' | 'mock' }] }>()

const mode = ref<'real' | 'mock'>(props.scenario.defaultMode)
const rawText = ref('')
const mockText = ref('')
const schemaText = ref('')

watch(() => props.scenario, (s) => {
  mode.value = s.defaultMode
  rawText.value = JSON.stringify(s.raw, null, 2)
  mockText.value = s.mockData ? JSON.stringify(s.mockData, null, 2) : ''
  schemaText.value = s.schema ? JSON.stringify(s.schema, null, 2) : ''
}, { immediate: true })

function run() {
  let raw: unknown, schema: unknown, mockData: unknown
  try { raw = JSON.parse(rawText.value) } catch { alert('原始数据 JSON 格式有误'); return }
  try { schema = schemaText.value.trim() ? JSON.parse(schemaText.value) : undefined } catch { alert('Schema JSON 格式有误'); return }
  try { mockData = mockText.value.trim() ? JSON.parse(mockText.value) : undefined } catch { alert('Mock 数据 JSON 格式有误'); return }
  emit('run', { raw, schema, mockData, mode: mode.value })
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">输入配置</span>
      <button class="run-btn" @click="run">运行</button>
    </div>
    <div class="panel-body">
      <div class="desc-card" v-html="scenario.desc" />

      <div class="mode-row">
        <span class="mode-label">模式</span>
        <div class="seg-ctrl">
          <button :class="['seg-opt', { active: mode === 'real' }]" @click="mode = 'real'">real</button>
          <button :class="['seg-opt', { active: mode === 'mock' }]" @click="mode = 'mock'">mock</button>
        </div>
      </div>

      <div class="field-group">
        <div class="field-label">原始数据 (DTO) <span class="tag">raw</span></div>
        <textarea v-model="rawText" rows="8" spellcheck="false" />
      </div>

      <div class="field-group" v-if="mode === 'mock'">
        <div class="field-label">Mock 数据 <span class="tag">mockData</span></div>
        <textarea v-model="mockText" rows="5" spellcheck="false" />
      </div>

      <div class="field-group">
        <div class="field-label">Schema 定义 <span class="tag">可选</span></div>
        <textarea v-model="schemaText" rows="6" spellcheck="false" />
      </div>
    </div>
  </div>
</template>
