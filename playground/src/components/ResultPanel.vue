<script setup lang="ts">
import type { SchemaDiff } from '@ai-request-guard/core'

defineProps<{
  viewmodel: string | null
  diff: SchemaDiff | null
  warns: string[]
  hasSchema: boolean
}>()
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">输出结果</span>
    </div>
    <div class="panel-body">

      <div class="output-section">
        <div class="output-section-title">ViewModel 输出</div>
        <div :class="['code-block', viewmodel === null ? 'placeholder' : '']">
          {{ viewmodel ?? '点击「运行」查看结果' }}
        </div>
      </div>

      <div class="output-section">
        <div class="output-section-title">Schema Diff</div>
        <div class="diff-tags">
          <template v-if="!diff">
            <div class="diff-tag ok">— 尚未运行 —</div>
          </template>
          <template v-else-if="!hasSchema">
            <div class="diff-tag ok">· 未配置 Schema，跳过 diff 校验</div>
          </template>
          <template v-else>
            <div v-if="diff.missingFields.length === 0 && diff.typeMismatches.length === 0 && diff.extraFields.length === 0" class="diff-tag ok">
              ✓ Schema 完全匹配，无差异
            </div>
            <div v-for="f in diff.missingFields" :key="'m-' + f" class="diff-tag missing">
              ⚠ 缺失字段 <code>{{ f }}</code>（Schema 中定义但 adapter 未输出）
            </div>
            <div v-for="m in diff.typeMismatches" :key="'t-' + m.field" class="diff-tag mismatch">
              ✕ 类型不匹配 <code>{{ m.field }}</code>：期望 <code>{{ m.expected }}</code>，实际 <code>{{ m.actual }}</code>
            </div>
            <div v-for="f in diff.extraFields" :key="'e-' + f" class="diff-tag extra">
              · 多余字段 <code>{{ f }}</code>（adapter 输出但 Schema 未定义，无需处理）
            </div>
          </template>
        </div>
      </div>

      <div class="output-section">
        <div class="output-section-title">SDK 警告捕获</div>
        <div class="warn-log">
          <template v-if="warns.length === 0">
            <span class="warn-empty">{{ viewmodel === null ? '无警告' : '✓ 无警告' }}</span>
          </template>
          <div v-for="(w, i) in warns" :key="i" class="warn-item">{{ w }}</div>
        </div>
      </div>

    </div>
  </div>
</template>
