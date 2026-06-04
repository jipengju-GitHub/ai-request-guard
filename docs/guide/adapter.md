# 编写 Adapter

## Adapter 是什么

Adapter 是你自己写的一个**普通函数**，SDK 不会自动生成它。

它做一件事：把后端接口返回的原始数据（字段命名混乱、结构嵌套、类型不统一）转换成前端页面需要的干净数据。

```
后端返回：{ user_id: 1, username: "penn", phone_no: "138..." }
                          ↓ adapter
前端拿到：{ id: 1, userName: "penn", mobile: "138..." }
```

**SDK 不会创建 adapter，也不会修改它。** 你写完之后通过 `register()` 告诉 SDK，SDK 在请求完成后自动调用它。

---

## 第一次使用：三步创建一个 Adapter

假设你有一个用户详情接口 `/api/user/detail`，后端返回：

```json
{
  "user_id": 1,
  "username": "penn",
  "phone_no": "138xxxxxxxx",
  "dept": { "dept_id": 10, "dept_name": "研发部" },
  "age": "28"
}
```

### 第一步：确定你的页面需要什么字段

先想清楚页面要用哪些字段、叫什么名字，这就是你的 ViewModel：

```
id, userName, mobile, deptName, age
```

### 第二步：写 adapter 函数

在防腐层文件中定义 adapter 函数并调用 `register`，将 `viewSchema`（期望的 ViewModel 结构）和 adapter 一起注册：

::: code-group

```js [JS]
// src/adapters/userAdapter.js
import AIRequestGuard from '@ai-request-guard/core'

export const getUserDetailAdapter = (raw) => {
  const dept = raw.dept ?? {}
  return {
    id: raw.user_id,
    userName: raw.username ?? '',
    mobile: raw.phone_no ?? '',
    deptName: dept.dept_name ?? '未知部门',
    age: Number(raw.age ?? 0),
  }
}

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '', mobile: '', deptName: '', age: 0 }),
  adapter: getUserDetailAdapter,
})
```

```ts [TS]
// src/adapters/userAdapter.ts
import AIRequestGuard from '@ai-request-guard/core'

export const getUserDetailAdapter = (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const dept = (r.dept ?? {}) as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    deptName: (dept.dept_name as string) ?? '未知部门',
    age: Number(r.age ?? 0),
  }
}

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '', mobile: '', deptName: '', age: 0 }),
  adapter: getUserDetailAdapter,
})
```

:::

### 第三步：用 AIRequestGuard 发请求

在同一个文件（或页面组件）里调用：

::: code-group

```js [JS]
import { getUserDetailAdapter } from './adapters/userAdapter'

export async function getUserDetail() {
  return AIRequestGuard({
    adapter: getUserDetailAdapter, 
    request: () => fetch('/api/user/detail').then((r) => r.json()), // 真实请求函数
  })
}
```

```ts [TS]
import { getUserDetailAdapter } from './adapters/userAdapter'

export async function getUserDetail() {
  return AIRequestGuard({
    adapter: getUserDetailAdapter, 
    request: () => fetch('/api/user/detail').then((r) => r.json()),
  })
}
```

:::

::: warning register 必须先执行
`AIRequestGuard.register()` 必须在 `AIRequestGuard()` 调用之前执行。
:::

---

## 如何修改 Adapter

直接改 `register()` 里的函数体，和改普通 JS 函数完全一样。

比如后端新增了一个 `email` 字段，你想加到 ViewModel：

::: code-group

```js [JS]
export const getUserDetailAdapter = (raw) => {
  const dept = raw.dept ?? {}
  return {
    id: raw.user_id,
    userName: raw.username ?? '',
    mobile: raw.phone_no ?? '',
    deptName: dept.dept_name ?? '未知部门',
    age: Number(raw.age ?? 0),
  }
}
```

```ts [TS]
export const getUserDetailAdapter = (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const dept = (r.dept ?? {}) as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    deptName: (dept.dept_name as string) ?? '未知部门',
    age: Number(r.age ?? 0),
  }
}
```

:::

**SDK 不会覆盖你写的内容**，adapter 文件完全由你掌控，和普通业务代码一样正常维护。

---

## 推荐的文件组织方式

### 小型项目

adapter 和请求函数放同一文件，结构简单直接：

```
src/
  api/
    user.js     ← register(adapter: getUserDetail, ...) + getUserDetail()
    order.js    ← register(adapter: getOrderList, ...) + getOrderList()
  main.js                 ← 最早 import './api/guard-setup' （如果需要配置的话）
```

### 中大型项目（推荐）

按模块拆分，adapter 文件只负责注册，不 export 任何东西；API 请求函数直接从 `@ai-request-guard/core` import，不绕 adapter 文件：

```
src/
  api/
    guard-setup.js        ← 唯一的 configure 入口 + 集中 import 所有 adapter
    modules/
      common/
        index.js          ← API 请求函数，直接 import core
        adapter.js        ← 只做 register，无 export
      user/
        index.js
        adapter.js
  main.js                 ← 最早 import './api/guard-setup' （如果需要配置的话）
```
---

## 常见映射场景

### 字段重命名

后端使用 `snake_case`，前端 ViewModel 统一用 `camelCase`：

::: code-group

```js [JS]
export const getUserDetailAdapter = (raw) => {
  return {
    userId: raw.user_id,
    userName: raw.username,
    phoneNo: raw.phone_no,
    createTime: raw.create_time,
  }
}
```

```ts [TS]
export const getUserDetailAdapter = (raw) => {
 const r = raw as Record<string, unknown>
  return {
    userId: r.user_id as number,
    userName: r.username as string,
    phoneNo: r.phone_no as string,
    createTime: r.create_time as string,
  }
}
```

:::

### 嵌套结构拍平

后端返回嵌套对象，前端直接用平铺字段：

::: code-group

```js [JS]
export const getUserDetailAdapter = (raw) => {
  const dept = raw.dept ?? {}
  return {
    id: raw.user_id,
    userName: raw.username ?? '',
    mobile: raw.phone_no ?? '',
    deptName: dept.dept_name ?? '未知部门',
    age: Number(raw.age ?? 0),
  }
}
```

```ts [TS]
export const getUserDetailAdapter = (raw: unknown) => {
  const r = raw as Record<string, unknown>
  const dept = (r.dept ?? {}) as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    deptName: (dept.dept_name as string) ?? '未知部门',
    age: Number(r.age ?? 0),
  }
}
```

:::

### 默认值补齐

后端可能不返回某些可选字段，adapter 在此兜底：

::: code-group

```js [JS]
export const getUserDetailAdapter = (raw) => {
  return {
    userId: raw.user_id,
    avatar: raw.avatar ?? 'https://example.com/default-avatar.png',
    tags: raw.tags ?? [],
    status: raw.status ?? 0,
  }
}
```

```ts [TS]
export const getUserDetailAdapter = (raw) => {
  const r = raw as Record<string, unknown>
  return {
    userId: r.user_id as number,
    avatar: (r.avatar as string) ?? 'https://example.com/default-avatar.png',
    tags: (r.tags as string[]) ?? [],
    status: (r.status as number) ?? 0,
  }
}
```

:::

### 类型转换

后端返回字符串数字，前端需要真实 number 类型：

::: code-group

```js [JS]
export const getUserDetailAdapter = (raw) => {
  return {
    price: Number(raw.price ?? 0), // "99.9" → 99.9
    stock: parseInt(raw.stock, 10) || 0,
    isActive: raw.is_active === 1 || raw.is_active === '1',
  }
}
```

```ts [TS]
export const getUserDetailAdapter = (raw) => {
  const r = raw as Record<string, unknown>
  return {
    price: Number(r.price ?? 0),
    stock: parseInt(r.stock as string, 10) || 0,
    isActive: r.is_active === 1 || r.is_active === '1',
  }
}
```

:::

### 数组转换

列表接口，对数组中每个 item 进行映射：

::: code-group

```js [JS]
const STATUS_MAP = {
  1: '待支付',
  2: '已完成',
  3: '已取消',
}

export const getOrderListAdapter = (raw) => {
  const list = raw.list ?? []
  return {
    total: raw.total ?? 0,
    items: list.map((item) => ({
      orderId: item.order_id,
      amount: item.order_amount,
      statusText: STATUS_MAP[item.status_code] ?? '未知状态',
    })),
  }
}
```

```ts [TS]
const STATUS_MAP: Record<number, string> = {
  1: '待支付',
  2: '已完成',
  3: '已取消',
}

export const getOrderListAdapter = (raw) => {
  const r = raw as Record<string, unknown>
  const list = (r.list as Array<Record<string, unknown>>) ?? []
  return {
    total: (r.total as number) ?? 0,
    items: list.map((item) => ({
      orderId: item.order_id as string,
      amount: item.order_amount as number,
      statusText: STATUS_MAP[item.status_code as number] ?? '未知状态',
    })),
  }
}
```

:::

### 数据计算与衍生字段

在 adapter 中做简单的业务计算，避免视图层出现逻辑代码：

::: code-group

```js [JS]
export const getCartDetailAdapter = (raw) => {
  const items = raw.items ?? []
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  return {
    items: items.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty,
    })),
    totalAmount,
    itemCount: items.length,
  }
}
```

```ts [TS]
export const getCartDetailAdapter = (raw) => {
  const r = raw as Record<string, unknown>
  const items = (r.items as Array<Record<string, unknown>>) ?? []
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.price as number) * (item.qty as number),
    0
  )
  return {
    items: items.map((item) => ({
      name: item.name as string,
      price: item.price as number,
      qty: item.qty as number,
    })),
    totalAmount,
    itemCount: items.length,
  }
}
```

:::

---

## Adapter 设计原则

**✅ 应该放入 Adapter 的：**

- 字段重命名（snake_case → camelCase）
- 结构变换（嵌套 → 平铺，列表映射）
- 类型转换（string → number，枚举 code → 文本）
- 默认值填充（缺字段时的兜底逻辑）
- 简单的衍生计算（总计、状态文本）

**❌ 不应该放入 Adapter 的：**

- 副作用（修改全局状态、调用其他 API）
- 异步操作（adapter 是同步纯函数）
- 复杂业务逻辑（这些属于视图层或 store）
- UI 相关逻辑（颜色、样式计算）

---

## 重复注册

同一个 id 重复调用 `register` 时，新的 adapter 会覆盖旧的。开发模式下会输出警告：

```
[AIRequestGuard] Adapter for "user-detail" is being overwritten.
```

如需动态更换 adapter，这是预期行为；若是误操作，请检查注册代码是否被重复执行。
