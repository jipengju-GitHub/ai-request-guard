import AIRequestGuard from '@ai-request-guard/core'
import 'virtual:ai-request-guard/report-sink'

// ── 全局配置 ──────────────────────────────────────────────
AIRequestGuard.configure({ dev: true })

// ── 输出工具 ──────────────────────────────────────────────
const output = document.getElementById('output')!

function log(label: string, data: unknown) {
  output.textContent = `[${label}]\n${JSON.stringify(data, null, 2)}`
  console.log(`[${label}]`, data)
}

function fakeRequest(data: unknown, delay = 150): () => Promise<unknown> {
  return () => new Promise((resolve) => setTimeout(() => resolve(data), delay))
}

// ══════════════════════════════════════════════════════════
// 原始数据样例
// ══════════════════════════════════════════════════════════

const rawUser = {
  user_id: 1,
  username: 'penn',
  phone_no: '138xxxxxxxx',
  dept: { dept_id: 10, dept_name: '研发部' },
  create_time: '2024-01-01 10:00:00',
  age: '28',           // 字符串，adapter 里会转为数字
}

const rawOrderList = {
  total: 2,
  list: [
    { order_id: 'A001', order_amount: 99.9, status_code: 1 },
    { order_id: 'A002', order_amount: 199.0, status_code: 2 },
  ],
}

const rawIncomplete = {
  user_id: 2,
  // 缺少 username、phone_no、dept
}

// ══════════════════════════════════════════════════════════
// 注册 Adapter
// ══════════════════════════════════════════════════════════

/** 用户详情：字段映射 + 嵌套结构 + 类型转换 + 默认值补齐 */
AIRequestGuard.register('user-detail', (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const dept = (r['dept'] ?? {}) as Record<string, unknown>
  return {
    id: r['user_id'] as number,
    userName: (r['username'] as string) ?? '',
    mobile: (r['phone_no'] as string) ?? '',
    // 嵌套结构拍平
    deptId: (dept['dept_id'] as number) ?? 0,
    deptName: (dept['dept_name'] as string) ?? '未知部门',
    // 类型转换：字符串 → 数字
    age: Number(r['age'] ?? 0),
    // 默认值补齐：接口没有 avatar 字段时给默认头像
    avatar: (r['avatar'] as string) ?? 'https://placeholder.com/avatar.png',
    createTime: (r['create_time'] as string) ?? '',
  }
})

/** 订单列表：数组转换 + 枚举映射 */
AIRequestGuard.register('order-list', (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const STATUS_MAP: Record<number, string> = { 1: '待支付', 2: '已完成', 3: '已取消' }
  const list = (r['list'] as Array<Record<string, unknown>>) ?? []
  return {
    total: (r['total'] as number) ?? 0,
    items: list.map((item) => ({
      orderId: item['order_id'] as string,
      amount: item['order_amount'] as number,
      // 枚举映射
      statusText: STATUS_MAP[item['status_code'] as number] ?? '未知状态',
    })),
  }
})

// ══════════════════════════════════════════════════════════
// 按钮事件：基础能力
// ══════════════════════════════════════════════════════════

document.getElementById('btn-real')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  })
  log('real 模式 — adapter 转换结果', result)
})

document.getElementById('btn-mock-static')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    mode: 'mock',
    mockData: { user_id: 99, username: 'mock-user', phone_no: '000-0000', dept: { dept_id: 1, dept_name: 'Mock部门' }, age: '18', create_time: '' },
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  })
  log('mock 静态数据 — 真实请求被跳过', result)
})

document.getElementById('btn-mock-fn')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    mode: 'mock',
    // 工厂函数：可根据 id 动态返回不同数据
    mockData: (id: string) => ({
      user_id: 0,
      username: `factory-mock [id="${id}"]`,
      phone_no: '188-8888-8888',
      dept: { dept_id: 99, dept_name: '工厂部门' },
      age: '30',
      create_time: new Date().toISOString(),
    }),
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  })
  log('mock 工厂函数 — 动态生成 mockData', result)
})

document.getElementById('btn-no-adapter')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'unregistered-api',
    request: fakeRequest({ raw_field: 'raw_value', count: 42 }),
  })
  log('无 adapter — 原始数据透传（Console 有警告）', result)
})

document.getElementById('btn-no-mockdata')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    mode: 'mock',
    // 故意不传 mockData，触发 dev 警告
  })
  log('mock 无数据 — 返回 null，Console 有警告', result)
})

// ══════════════════════════════════════════════════════════
// 按钮事件：Schema 校验
// ══════════════════════════════════════════════════════════

document.getElementById('btn-schema-ok')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  })
  log('schema 完全匹配 — Console 无警告', result)
})

document.getElementById('btn-schema-missing')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    // schema 里多了 email / phone，adapter 里没有返回
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '', email: '', phone: '' },
  })
  log('缺失字段 — Console 有 missingFields 警告', result)
})

document.getElementById('btn-schema-type')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    // schema 里 age 期望 string，adapter 返回 number
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: '', avatar: '', createTime: '' },
  })
  log('类型不匹配 — Console 有 typeMismatches 警告', result)
})

document.getElementById('btn-schema-extra')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
    // schema 里比 adapter 输出少几个字段（adapter 多映射了 deptId/avatar/createTime）
    schema: { id: 0, userName: '', mobile: '' },
  })
  log('多余字段 — extraFields 不触发警告（Console 无误报）', result)
})

// ══════════════════════════════════════════════════════════
// 真实请求拦截（fetch interceptor）
// ══════════════════════════════════════════════════════════

// 注册 URL 监听规则，fetch 拦截器自动上报 raw 数据到 devServer
AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch('/api/order/list', 'order-list')

document.getElementById('btn-fetch-user')!.addEventListener('click', async () => {
  const res = await fetch('/api/user/detail')
  const data = await res.json()
  log('真实 GET /api/user/detail（拦截器自动上报）', data)
})

document.getElementById('btn-fetch-order')!.addEventListener('click', async () => {
  const res = await fetch('/api/order/list')
  const data = await res.json()
  log('真实 GET /api/order/list（拦截器自动上报）', data)
})

// ══════════════════════════════════════════════════════════
// 按钮事件：Adapter 能力
// ══════════════════════════════════════════════════════════

document.getElementById('btn-nested')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawUser),
  })
  log('嵌套结构处理 — dept.dept_name → deptName', result)
})

document.getElementById('btn-array')!.addEventListener('click', async () => {
  const result = await AIRequestGuard({
    id: 'order-list',
    request: fakeRequest(rawOrderList),
    schema: { total: 0, items: [] },
  })
  log('数组转换 — list[] 映射 + 枚举文本化', result)
})

document.getElementById('btn-default')!.addEventListener('click', async () => {
  // 缺少大量字段的原始数据，验证默认值补齐
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest(rawIncomplete),
  })
  log('默认值补齐 — 缺失字段由 adapter 填充默认值', result)
})

document.getElementById('btn-typecast')!.addEventListener('click', async () => {
  // rawUser.age 是字符串 '28'，adapter 转为 number
  const result = await AIRequestGuard({
    id: 'user-detail',
    request: fakeRequest({ ...rawUser, age: '28' }),
    schema: { id: 0, userName: '', mobile: '', deptId: 0, deptName: '', age: 0, avatar: '', createTime: '' },
  })
  log('类型转换 — age "28"(string) → 28(number)', result)
})
