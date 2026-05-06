import AIRequestGuard from '@ai-request-guard/core'
import { validateSchema } from '@ai-request-guard/core'
import type { SchemaDiff } from '@ai-request-guard/core'
import 'virtual:ai-request-guard/report-sink'

AIRequestGuard.configure({ dev: true })

// ── 注册 Adapters ─────────────────────────────────────────
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

// ── 真实请求拦截 ──────────────────────────────────────────
AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch('/api/order/list', 'order-list')

// ── 场景定义 ──────────────────────────────────────────────
interface Scenario {
  id: string
  label: string
  desc: string
  adapterId: string
  raw: unknown
  schema?: Record<string, unknown>
  mockData?: unknown
  defaultMode: 'real' | 'mock'
}

const scenarios: Scenario[] = [
  {
    id: 'user-real',
    label: '用户详情（real）',
    desc: '<strong>场景：</strong>正常 real 模式，adapter 对字段重命名、嵌套拍平、类型转换，schema 完全匹配，无差异警告。',
    adapterId: 'user-detail',
    defaultMode: 'real',
    raw: { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  },
  {
    id: 'user-mock',
    label: 'Mock 静态数据',
    desc: '<strong>场景：</strong>mock 模式，request 函数被跳过，直接使用 mockData 经过 adapter 转换后返回。',
    adapterId: 'user-detail',
    defaultMode: 'mock',
    raw: { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' },
    mockData: { user_id: 99, username: 'mock-user', phone_no: '000-0000', dept: { dept_id: 1, dept_name: 'Mock部门' }, age: '18', create_time: '' },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  },
  {
    id: 'schema-missing',
    label: 'Schema 缺失字段',
    desc: '<strong>场景：</strong>Schema 中定义了 <code>email</code> 和 <code>phone</code>，但 adapter 输出中没有这两个字段，触发 missingFields 警告。',
    adapterId: 'user-detail',
    defaultMode: 'real',
    raw: { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '', email: '', phone: '' },
  },
  {
    id: 'schema-type',
    label: 'Schema 类型不匹配',
    desc: '<strong>场景：</strong>Schema 中 <code>age</code> 期望 string，但 adapter 做了类型转换返回 number，触发 typeMismatches 警告。',
    adapterId: 'user-detail',
    defaultMode: 'real',
    raw: { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: '', avatar: '', createTime: '' },
  },
  {
    id: 'schema-extra',
    label: 'Schema 多余字段',
    desc: '<strong>场景：</strong>adapter 输出的字段比 schema 定义的多（extraFields），<strong>不触发警告</strong>，属于正常的 adapter 多映射情况。',
    adapterId: 'user-detail',
    defaultMode: 'real',
    raw: { user_id: 1, username: 'penn', phone_no: '138xxxxxxxx', dept: { dept_id: 10, dept_name: '研发部' }, create_time: '2024-01-01', age: '28' },
    schema: { id: 0, userName: '' },
  },
  {
    id: 'no-adapter',
    label: '无 Adapter 透传',
    desc: '<strong>场景：</strong>接口 ID 没有注册 adapter，SDK 在 dev 模式下发出警告，并将原始数据直接透传返回。',
    adapterId: 'unregistered-api',
    defaultMode: 'real',
    raw: { raw_field: 'raw_value', count: 42 },
  },
  {
    id: 'default-fill',
    label: '默认值补齐',
    desc: '<strong>场景：</strong>原始数据字段缺失，adapter 使用默认值兜底，保证 ViewModel 结构完整。',
    adapterId: 'user-detail',
    defaultMode: 'real',
    raw: { user_id: 2 },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  },
  {
    id: 'order-list',
    label: '数组 + 枚举映射',
    desc: '<strong>场景：</strong>adapter 将 list[] 数组中每项做字段映射，并将数字状态码转为可读文本（枚举映射）。',
    adapterId: 'order-list',
    defaultMode: 'real',
    raw: { total: 2, list: [{ order_id: 'A001', order_amount: 99.9, status_code: 1 }, { order_id: 'A002', order_amount: 199.0, status_code: 2 }] },
    schema: { total: 0, items: [] },
  },
]

// ── DOM 引用 ──────────────────────────────────────────────
const scenarioBar = document.getElementById('scenario-bar')!
const descCard = document.getElementById('desc-card')!
const modeSelect = document.getElementById('mode-select') as HTMLSelectElement
const mockGroup = document.getElementById('mock-group')!
const rawInput = document.getElementById('raw-input') as HTMLTextAreaElement
const mockInput = document.getElementById('mock-input') as HTMLTextAreaElement
const schemaInput = document.getElementById('schema-input') as HTMLTextAreaElement
const runBtn = document.getElementById('run-btn')!
const outViewmodel = document.getElementById('out-viewmodel')!
const outDiff = document.getElementById('out-diff')!
const outWarns = document.getElementById('out-warns')!

// ── 拦截 console.warn ─────────────────────────────────────
const capturedWarns: string[] = []
const _origWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  capturedWarns.push(args.map(String).join(' '))
  _origWarn(...args)
}

// ── 加载场景 ──────────────────────────────────────────────
let activeScenario: Scenario = scenarios[0]

function loadScenario(s: Scenario) {
  activeScenario = s
  descCard.innerHTML = s.desc
  modeSelect.value = s.defaultMode
  rawInput.value = JSON.stringify(s.raw, null, 2)
  mockInput.value = s.mockData ? JSON.stringify(s.mockData, null, 2) : ''
  schemaInput.value = s.schema ? JSON.stringify(s.schema, null, 2) : ''
  mockGroup.style.display = s.defaultMode === 'mock' ? '' : 'none'
  resetOutput()
  document.querySelectorAll('.scenario-tab').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.id === s.id)
  })
}

function resetOutput() {
  outViewmodel.textContent = '点击「运行」查看结果'
  outViewmodel.className = 'code-block placeholder'
  outDiff.innerHTML = '<div class="diff-tag ok">— 尚未运行 —</div>'
  outWarns.innerHTML = '<span class="warn-empty">无警告</span>'
}

// ── 渲染 diff ─────────────────────────────────────────────
function renderDiff(diff: SchemaDiff) {
  const tags: string[] = []

  if (diff.missingFields.length === 0 && diff.typeMismatches.length === 0 && diff.extraFields.length === 0) {
    tags.push('<div class="diff-tag ok">✓ Schema 完全匹配，无差异</div>')
  }

  diff.missingFields.forEach((f) => {
    tags.push(`<div class="diff-tag missing">⚠ 缺失字段 <code>${f}</code>（Schema 中定义但 adapter 未输出）</div>`)
  })

  diff.typeMismatches.forEach((m) => {
    tags.push(`<div class="diff-tag mismatch">✕ 类型不匹配 <code>${m.field}</code>：期望 <code>${m.expected}</code>，实际 <code>${m.actual}</code></div>`)
  })

  diff.extraFields.forEach((f) => {
    tags.push(`<div class="diff-tag extra">· 多余字段 <code>${f}</code>（adapter 输出但 Schema 未定义，无需处理）</div>`)
  })

  outDiff.innerHTML = tags.join('')
}

// ── 运行 ──────────────────────────────────────────────────
async function run() {
  capturedWarns.length = 0

  let raw: unknown
  let schema: Record<string, unknown> | undefined
  let mockData: unknown

  try { raw = JSON.parse(rawInput.value) } catch { alert('原始数据 JSON 格式有误'); return }
  try { schema = schemaInput.value.trim() ? JSON.parse(schemaInput.value) : undefined } catch { alert('Schema JSON 格式有误'); return }
  try { mockData = mockInput.value.trim() ? JSON.parse(mockInput.value) : undefined } catch { alert('Mock 数据 JSON 格式有误'); return }

  const mode = modeSelect.value as 'real' | 'mock'

  const result = await AIRequestGuard({
    id: activeScenario.adapterId,
    request: () => Promise.resolve(raw),
    schema,
    mode,
    mockData,
  })

  // ViewModel 输出
  outViewmodel.textContent = JSON.stringify(result, null, 2)
  outViewmodel.className = 'code-block'

  // Diff
  if (schema && typeof result === 'object' && result !== null) {
    const diff = validateSchema(activeScenario.adapterId, result, schema)
    renderDiff(diff)
  } else {
    outDiff.innerHTML = '<div class="diff-tag ok">· 未配置 Schema，跳过 diff 校验</div>'
  }

  // 警告
  if (capturedWarns.length) {
    outWarns.innerHTML = capturedWarns.map((w) => `<div class="warn-item">${w}</div>`).join('')
  } else {
    outWarns.innerHTML = '<span class="warn-empty">✓ 无警告</span>'
  }
}

// ── 初始化 ────────────────────────────────────────────────
scenarios.forEach((s) => {
  const tab = document.createElement('div')
  tab.className = 'scenario-tab'
  tab.textContent = s.label
  tab.dataset.id = s.id
  tab.addEventListener('click', () => loadScenario(s))
  scenarioBar.appendChild(tab)
})

modeSelect.addEventListener('change', () => {
  mockGroup.style.display = modeSelect.value === 'mock' ? '' : 'none'
})

runBtn.addEventListener('click', run)

loadScenario(scenarios[0])

// ── 主题切换 ──────────────────────────────────────────────
const themeBtn = document.getElementById('theme-btn')!
themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme')
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  themeBtn.textContent = next === 'dark' ? '☀️' : '🌙'
  localStorage.setItem('pg-theme', next)
})
