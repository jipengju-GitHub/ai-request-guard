export interface Scenario {
  id: string
  label: string
  desc: string
  adapterId: string
  raw: unknown
  schema?: Record<string, unknown>
  mockData?: unknown
  defaultMode: 'real' | 'mock'
}

export const scenarios: Scenario[] = [
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
