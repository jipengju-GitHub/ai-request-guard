<script setup lang="ts">
import { ref } from 'vue'
import AIRequestGuard, { validateSchema } from '@ai-request-guard/core'
import type { SchemaDiff } from '@ai-request-guard/core'
import 'virtual:ai-request-guard/report-sink'
import { scenarios } from './scenarios'
import ScenarioPanel from './components/ScenarioPanel.vue'
import ResultPanel from './components/ResultPanel.vue'

AIRequestGuard.configure({ dev: true })

AIRequestGuard.register('user-detail', (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const dept = (r['dept'] ?? {}) as Record<string, unknown>
  return {
    id: r['user_id'] as number,
    userName: (r['username'] as string) ?? '',
    mobile: (r['phone_no'] as string) ?? '',
    deptId: (dept['dept_id'] as number) ?? 0,
    deptName: (dept['dept_name'] as string) ?? '未知部门',
    age: Number(r['age'] ?? 0),
    avatar: (r['avatar'] as string) ?? 'https://placeholder.com/avatar.png',
    createTime: (r['create_time'] as string) ?? '',
  }
})

AIRequestGuard.register('order-list', (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const STATUS_MAP: Record<number, string> = { 1: '待支付', 2: '已完成', 3: '已取消' }
  const list = (r['list'] as Array<Record<string, unknown>>) ?? []
  return {
    total: (r['total'] as number) ?? 0,
    items: list.map((item) => ({
      orderId: item['order_id'] as string,
      amount: item['order_amount'] as number,
      statusText: STATUS_MAP[item['status_code'] as number] ?? '未知状态',
    })),
  }
})

AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch('/api/order/list', 'order-list')

const activeIndex = ref(0)
const viewmodel = ref<string | null>(null)
const diff = ref<SchemaDiff | null>(null)
const warns = ref<string[]>([])
const hasSchema = ref(false)

const capturedWarns: string[] = []
const _origWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  capturedWarns.push(args.map(String).join(' '))
  _origWarn(...args)
}

function selectScenario(i: number) {
  activeIndex.value = i
  viewmodel.value = null
  diff.value = null
  warns.value = []
  hasSchema.value = false
}

async function onRun(params: { raw: unknown; schema: unknown; mockData: unknown; mode: 'real' | 'mock' }) {
  capturedWarns.length = 0
  const scenario = scenarios[activeIndex.value]

  const result = await AIRequestGuard({
    id: scenario.adapterId,
    request: () => Promise.resolve(params.raw),
    schema: params.schema as Record<string, unknown> | undefined,
    mode: params.mode,
    mockData: params.mockData,
  })

  viewmodel.value = JSON.stringify(result, null, 2)
  hasSchema.value = !!params.schema

  if (params.schema && typeof result === 'object' && result !== null) {
    diff.value = validateSchema(scenario.adapterId, result, params.schema as Record<string, unknown>)
  } else {
    diff.value = { id: scenario.adapterId, missingFields: [], typeMismatches: [], extraFields: [] }
  }

  warns.value = [...capturedWarns]
}

// 主题
const theme = ref(localStorage.getItem('pg-theme') ?? 'light')
document.documentElement.setAttribute('data-theme', theme.value)

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('pg-theme', theme.value)
}
</script>

<template>
  <header>
    <img src="/logo.svg" alt="logo" style="width:28px;height:28px;flex-shrink:0;">
    <h1>AIRequestGuard</h1>
    <span class="badge">Playground</span>
    <div class="header-actions">
      <button class="theme-btn" @click="toggleTheme" title="切换主题">
        {{ theme === 'dark' ? '☀️' : '🌙' }}
      </button>
      <a href="https://guard.pennji.cn/" target="_blank">文档</a>
    </div>
  </header>

  <div class="scenario-bar">
    <div
      v-for="(s, i) in scenarios"
      :key="s.id"
      :class="['scenario-tab', { active: i === activeIndex }]"
      @click="selectScenario(i)"
    >{{ s.label }}</div>
  </div>

  <div class="main">
    <ScenarioPanel :scenario="scenarios[activeIndex]" @run="onRun" />
    <ResultPanel :viewmodel="viewmodel" :diff="diff" :warns="warns" :has-schema="hasSchema" />
  </div>
</template>
