<script setup lang="ts">
import { ref } from 'vue'
import AIRequestGuard, { validateSchema } from '@ai-request-guard/core'
import type { SchemaDiff, AdapterFn } from '@ai-request-guard/core'
import 'virtual:ai-request-guard/report-sink'
import type { Scenario } from './scenarios'
import ScenarioPanel from './components/ScenarioPanel.vue'
import ResultPanel from './components/ResultPanel.vue'

AIRequestGuard.configure({ dev: true })

// ── adapters ──────────────────────────────────────────────────────────────────

const getUserDetailAdapter = (raw: unknown) => {
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
}

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' }),
  adapter: getUserDetailAdapter,
})

const getOrderListAdapter = (raw: unknown) => {
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
}

AIRequestGuard.register({
  viewSchema: () => ({ total: 0, items: [] }),
  adapter: getOrderListAdapter,
})

// 未注册的 adapter，用于演示"无 Adapter 透传"场景
const unregisteredAdapter = (raw: unknown) => raw

AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
AIRequestGuard.watch('/api/order/list', getOrderListAdapter)

// ── scenarios ─────────────────────────────────────────────────────────────────

const userRaw = { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' }

const userSchema = { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' }

const scenarios: Scenario[] = [
  {
    id: 'user-real',
    label: '用户详情（real）',
    desc: '<strong>场景：</strong>正常 real 模式，adapter 对字段重命名、嵌套拍平、类型转换，schema 完全匹配，无差异警告。',
    adapter: getUserDetailAdapter,
    defaultMode: 'real',
    raw: userRaw,
    displaySchema: userSchema,
  },
  {
    id: 'user-mock',
    label: 'Mock 静态数据',
    desc: '<strong>场景：</strong>mock 模式，request 函数被跳过，直接使用 viewSchema 经过 adapter 转换后返回。',
    adapter: getUserDetailAdapter,
    defaultMode: 'mock',
    raw: userRaw,
    displaySchema: userSchema,
  },
  {
    id: 'schema-missing',
    label: 'Schema 缺失字段',
    desc: '<strong>场景：</strong>adapter 输出中缺少 <code>email</code> 和 <code>phone</code> 字段，触发 missingFields 警告。',
    adapter: getUserDetailAdapter,
    defaultMode: 'real',
    raw: userRaw,
    displaySchema: { ...userSchema, email: '', phone: '' },
  },
  {
    id: 'schema-type',
    label: 'Schema 类型不匹配',
    desc: '<strong>场景：</strong>adapter 将 <code>age</code> 转为 number，但 schema 期望 string，触发 typeMismatches 警告。',
    adapter: getUserDetailAdapter,
    defaultMode: 'real',
    raw: userRaw,
    displaySchema: { ...userSchema, age: '' },
  },
  {
    id: 'schema-extra',
    label: 'Schema 多余字段',
    desc: '<strong>场景：</strong>adapter 输出的字段比 schema 多（extraFields），<strong>不触发警告</strong>，属于正常的多映射情况。',
    adapter: getUserDetailAdapter,
    defaultMode: 'real',
    raw: userRaw,
    displaySchema: { id: 0, userName: '' },
  },
  {
    id: 'no-adapter',
    label: '无 Adapter 透传',
    desc: '<strong>场景：</strong>adapter 未注册，SDK 在 dev 模式下发出警告，并将原始数据直接透传返回。',
    adapter: unregisteredAdapter,
    defaultMode: 'real',
    raw: { raw_field: 'raw_value', count: 42 },
  },
  {
    id: 'default-fill',
    label: '默认值补齐',
    desc: '<strong>场景：</strong>原始数据字段缺失，adapter 使用默认值兜底，保证 ViewModel 结构完整。',
    adapter: getUserDetailAdapter,
    defaultMode: 'real',
    raw: { user_id: 2 },
    displaySchema: userSchema,
  },
  {
    id: 'order-list',
    label: '数组 + 枚举映射',
    desc: '<strong>场景：</strong>adapter 将 list[] 数组中每项做字段映射，并将数字状态码转为可读文本（枚举映射）。',
    adapter: getOrderListAdapter,
    defaultMode: 'real',
    raw: { total: 2, list: [{ order_id: 'A001', order_amount: 99.9, status_code: 1 }, { order_id: 'A002', order_amount: 199.0, status_code: 2 }] },
    displaySchema: { total: 0, items: [] },
  },
]

// ── runtime ───────────────────────────────────────────────────────────────────

const activeIndex = ref(0)
const viewmodel = ref<string | null>(null)
const diff = ref<SchemaDiff | null>(null)
const warns = ref<string[]>([])

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
}

async function onRun(params: { raw: unknown; mode: 'real' | 'mock' }) {
  capturedWarns.length = 0
  const scenario = scenarios[activeIndex.value]

  const result = await AIRequestGuard({
    adapter: scenario.adapter as AdapterFn,
    request: () => Promise.resolve(params.raw),
    mode: params.mode,
  })

  viewmodel.value = JSON.stringify(result, null, 2)

  const schema = scenario.displaySchema
  const id = scenario.adapter.name || scenario.id

  if (schema && typeof result === 'object' && result !== null) {
    diff.value = validateSchema(id, result, schema)
  } else {
    diff.value = { id, missingFields: [], typeMismatches: [], extraFields: [] }
  }

  warns.value = [...capturedWarns]
}

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
    <a class="logo-wrap" href="/" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
      <img src="/logo.svg" alt="logo">
      <h1>AIRequestGuard</h1>
    </a>
    <span class="badge">Playground</span>
    <div class="header-right">
      <button class="icon-btn" @click="toggleTheme" :title="theme === 'dark' ? '切换亮色' : '切换暗色'">
        <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <a class="doc-link" href="https://guard.pennji.cn/" target="_blank">文档</a>
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
    <ResultPanel :viewmodel="viewmodel" :diff="diff" :warns="warns" :has-schema="!!diff" />
  </div>
</template>
