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
        <div class="output-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          ViewModel 输出
        </div>
        <div :class="['code-block', viewmodel === null ? 'placeholder' : '']">{{ viewmodel ?? '点击「运行」查看结果' }}</div>
      </div>

      <div class="output-section">
        <div class="output-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Schema Diff
        </div>
        <div class="diff-tags">
          <template v-if="!diff">
            <div class="diff-tag ok">尚未运行</div>
          </template>
          <template v-else-if="!hasSchema">
            <div class="diff-tag extra">未配置 Schema，跳过 diff 校验</div>
          </template>
          <template v-else>
            <div v-if="diff.missingFields.length === 0 && diff.typeMismatches.length === 0 && diff.extraFields.length === 0" class="diff-tag ok">
              Schema 完全匹配，无差异
            </div>
            <div v-for="f in diff.missingFields" :key="'m-' + f" class="diff-tag missing">
              缺失字段 <code>{{ f }}</code>（Schema 中定义但 adapter 未输出）
            </div>
            <div v-for="m in diff.typeMismatches" :key="'t-' + m.field" class="diff-tag mismatch">
              类型不匹配 <code>{{ m.field }}</code>：期望 <code>{{ m.expected }}</code>，实际 <code>{{ m.actual }}</code>
            </div>
            <div v-for="f in diff.extraFields" :key="'e-' + f" class="diff-tag extra">
              多余字段 <code>{{ f }}</code>（adapter 输出但 Schema 未定义）
            </div>
          </template>
        </div>
      </div>

      <div class="output-section">
        <div class="output-section-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SDK 警告
        </div>
        <div class="warn-log">
          <template v-if="warns.length === 0">
            <span class="warn-empty">{{ viewmodel === null ? '— 尚未运行 —' : '无警告' }}</span>
          </template>
          <div v-for="(w, i) in warns" :key="i" class="warn-item">{{ w }}</div>
        </div>
      </div>

    </div>
  </div>
</template>
