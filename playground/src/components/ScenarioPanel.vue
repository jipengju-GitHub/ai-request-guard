<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Scenario } from '../scenarios'

const props = defineProps<{ scenario: Scenario }>()
const emit = defineEmits<{ run: [params: { raw: unknown; mode: 'real' | 'mock' }] }>()

const mode = ref<'real' | 'mock'>(props.scenario.defaultMode)
const rawText = ref('')

watch(() => props.scenario, (s) => {
  mode.value = s.defaultMode
  rawText.value = JSON.stringify(s.raw, null, 2)
}, { immediate: true })

function run() {
  let raw: unknown
  try { raw = JSON.parse(rawText.value) } catch { alert('原始数据 JSON 格式有误'); return }
  emit('run', { raw, mode: mode.value })
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
    </div>
  </div>
</template>
