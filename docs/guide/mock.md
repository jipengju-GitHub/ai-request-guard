# Mock 系统

Mock 系统允许你在开发阶段使用本地数据替代真实请求，前后端可以并行开发，互不阻塞。

::: warning 仅开发环境生效
Mock 相关代码在生产构建时会通过 `__DEV__` 标志被 tree-shake，不会进入线上产物。
:::

## 启用 Mock 模式

有两种粒度可以控制 mock：

### 全局模式

::: code-group

```js [JS]
AIRequestGuard.setMode('mock') // 所有接口默认使用 mock
AIRequestGuard.setMode('real') // 恢复为真实请求
```

```ts [TS]
AIRequestGuard.setMode('mock') // 所有接口默认使用 mock
AIRequestGuard.setMode('real') // 恢复为真实请求
```

:::

### 单接口模式

在调用时传入 `mode: 'mock'`，优先级高于全局设置：

::: code-group

```js [JS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock', // 仅此接口走 mock
  mockData: { user_id: 1, username: 'test' },
})
```

```ts [TS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock', // 仅此接口走 mock
  mockData: { user_id: 1, username: 'test' },
})
```

:::

## 静态 Mock 数据

直接传入一个对象作为原始响应数据（会经过 adapter 转换）：

::: code-group

```js [JS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock',
  mockData: {
    user_id: 99,
    username: 'mock-user',
    phone_no: '138-0000-0000',
    dept: { dept_id: 1, dept_name: 'Mock部门' },
    age: '25',
    create_time: '2024-01-01 00:00:00',
  },
})
```

```ts [TS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock',
  mockData: {
    user_id: 99,
    username: 'mock-user',
    phone_no: '138-0000-0000',
    dept: { dept_id: 1, dept_name: 'Mock部门' },
    age: '25',
    create_time: '2024-01-01 00:00:00',
  },
})
```

:::

::: tip
`mockData` 传入的是**后端原始格式**的数据，adapter 仍会执行映射。这样 mock 数据与真实数据保持一致的结构，便于发现不一致问题。
:::

## 工厂函数

当需要动态生成 mock 数据（如根据接口 id 生成不同内容），可以传入工厂函数：

::: code-group

```js [JS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock',
  mockData: (id) => ({
    user_id: Math.floor(Math.random() * 1000),
    username: `mock-user-${id}`,
    phone_no: '188-8888-8888',
    dept: { dept_id: 99, dept_name: '动态Mock部门' },
    age: String(Math.floor(Math.random() * 30) + 20),
    create_time: new Date().toISOString(),
  }),
})
```

```ts [TS]
const result = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock',
  mockData: (id: string) => ({
    user_id: Math.floor(Math.random() * 1000),
    username: `mock-user-${id}`,
    phone_no: '188-8888-8888',
    dept: { dept_id: 99, dept_name: '动态Mock部门' },
    age: String(Math.floor(Math.random() * 30) + 20),
    create_time: new Date().toISOString(),
  }),
})
```

:::

工厂函数接收 `id`（adapter id）作为参数，返回 mock 数据对象。

## 未提供 mockData 的情况

`mode: 'mock'` 但未传 `mockData` 时，返回 `null`，开发模式下会发出警告：

```
[AIRequestGuard] No mockData provided for "user-detail" in mock mode. Returning null.
```

## 推荐的 Mock 管理方式

建议将所有 mock 数据集中在一个文件中管理：

::: code-group

```js [JS]
// src/mock/index.js
export const mockUserDetail = {
  user_id: 1,
  username: 'penn',
  phone_no: '138xxxxxxxx',
  dept: { dept_id: 10, dept_name: '研发部' },
  age: '28',
  create_time: '2024-01-01 10:00:00',
}

export const mockOrderList = {
  total: 2,
  list: [
    { order_id: 'A001', order_amount: 99.9, status_code: 1 },
    { order_id: 'A002', order_amount: 199.0, status_code: 2 },
  ],
}
```

```ts [TS]
// src/mock/index.ts
export const mockUserDetail = {
  user_id: 1,
  username: 'penn',
  phone_no: '138xxxxxxxx',
  dept: { dept_id: 10, dept_name: '研发部' },
  age: '28',
  create_time: '2024-01-01 10:00:00',
}

export const mockOrderList = {
  total: 2,
  list: [
    { order_id: 'A001', order_amount: 99.9, status_code: 1 },
    { order_id: 'A002', order_amount: 199.0, status_code: 2 },
  ],
}
```

:::

::: code-group

```js [JS]
// src/api/user.js
import { mockUserDetail } from '@/mock'

export async function getUserDetail() {
  return AIRequestGuard({
    id: 'user-detail',
    request: () => fetch('/api/user/detail').then(r => r.json()),
    mode: import.meta.env.DEV ? 'mock' : 'real',
    mockData: mockUserDetail,
    schema: { id: 0, userName: '', mobile: '', deptName: '', age: 0 },
  })
}
```

```ts [TS]
// src/api/user.ts
import { mockUserDetail } from '@/mock'

export async function getUserDetail() {
  return AIRequestGuard({
    id: 'user-detail',
    request: () => fetch('/api/user/detail').then(r => r.json()),
    mode: import.meta.env.DEV ? 'mock' : 'real',
    mockData: mockUserDetail,
    schema: { id: 0, userName: '', mobile: '', deptName: '', age: 0 },
  })
}
```

:::
