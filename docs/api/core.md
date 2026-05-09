# @ai-request-guard/core

## AIRequestGuard()

主函数，发起请求并经过 adapter 转换后返回 ViewModel。

```ts
function AIRequestGuard<T = unknown>(options: GuardOptions<T>): Promise<T>
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `options.adapter` | `AdapterFn<T>` | ✅ | 已通过 `AIRequestGuard.register()` 注册的 adapter 函数引用 |
| `options.request` | `() => Promise<unknown>` | ✅ | 发起真实请求的函数，mock 模式下不会被调用 |
| `options.mode` | `'real' \| 'mock'` | — | 单接口模式，优先级高于全局 mode |

**示例：**

::: code-group

```js [JS]
import { getUserDetailAdapter } from './adapters/userAdapter'

const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})
```

```ts [TS]
import { getUserDetailAdapter } from './adapters/userAdapter'

const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})
```

:::

---

## AIRequestGuard.register()

注册 adapter。adapter 是一个纯函数，将后端 DTO 映射为前端 ViewModel。函数名自动作为内部 ID。

```ts
AIRequestGuard.register<T>(options: RegisterOptions<T>): void
```

**参数（RegisterOptions）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `adapter` | `(raw: unknown) => T` | ✅ | 转换函数，函数名自动作为内部 ID |
| `viewSchema` | `unknown \| (() => unknown)` | — | 前端视图层期望的数据结构，支持静态值或工厂函数 |

`viewSchema` 用途：
- **mock 模式**：作为返回数据经 adapter 转换后返回
- **dev 模式**：内部自动推导 schema，对 adapter 输出做 diff 校验
- **未传**：跳过 diff 校验，报告标记"未配置 viewSchema"

**示例：**

::: code-group

```js [JS]
// src/adapters/userAdapter.js
export const getUserDetailAdapter = (raw) => ({
  id: raw.user_id,
  userName: raw.username ?? '',
  mobile: raw.phone_no ?? '',
})

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '', mobile: '' }),
  adapter: getUserDetailAdapter,
})
```

```ts [TS]
// src/adapters/userAdapter.ts
export const getUserDetailAdapter = (raw: unknown) => {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
  }
}

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '', mobile: '' }),
  adapter: getUserDetailAdapter,
})
```

:::

::: tip mockjs 兼容
`viewSchema` 支持工厂函数，兼容 mockjs：

```ts
import Mock from 'mockjs'

AIRequestGuard.register({
  viewSchema: () => Mock.mock({ 'id|1-100': 1, userName: '@cname' }),
  adapter: getUserDetailAdapter,
})
```
:::

::: tip
建议将 adapter 函数和 `register` 调用集中在防腐层文件（如 `src/adapters/`）中维护，应用层只传入函数引用。
:::

---

## AIRequestGuard.configure()

更新全局配置，传入的字段与现有配置浅合并。

```ts
AIRequestGuard.configure(config: GuardConfig): void
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `config.mode` | `'real' \| 'mock'` | `'real'` | 全局请求模式 |
| `config.dev` | `boolean` | 跟随 `NODE_ENV` | 是否启用开发模式 |

**示例：**

```js
AIRequestGuard.configure({ dev: true, mode: 'mock' })
```

---

## AIRequestGuard.setMode()

切换全局请求模式的快捷方法。

```ts
AIRequestGuard.setMode(mode: 'real' | 'mock'): void
```

**示例：**

```js
AIRequestGuard.setMode('mock') // 全局使用 mock
AIRequestGuard.setMode('real') // 恢复真实请求
```

---

## AIRequestGuard.watch()

注册真实请求拦截规则（仅 dev 构建生效）。当 fetch 发出的请求 URL 匹配 `pattern` 时，响应 raw data 会自动上报给 devServer。

```ts
AIRequestGuard.watch(pattern: string | RegExp, adapter: AdapterFn): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pattern` | `string \| RegExp` | URL 匹配规则：字符串为包含匹配，正则为完整匹配 |
| `adapter` | `AdapterFn` | 对应的 adapter 函数引用，需已通过 `register()` 注册 |

**示例：**

```js
import { getUserDetailAdapter } from './adapters/userAdapter'

AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)
```

---

## AIRequestGuard.clearWatch()

清空所有 watch 规则，主要用于测试环境重置。

```ts
AIRequestGuard.clearWatch(): void
```

---

## inferSchema()

从 mock 数据对象推导 schema，内部由 `register` 自动调用，也可在代码中直接使用。

```ts
function inferSchema(mockData: Record<string, unknown>): Schema
```

推导规则：保留字段名，将字段值替换为对应类型的零值（`string → ''`，`number → 0`，`boolean → false`，`array → []`，`object → {}`，其余 → `null`）。

**示例：**

```ts
import { inferSchema } from '@ai-request-guard/core'

const mock = { userName: '张三', mobile: '13800138000', age: 28, active: true }
const schema = inferSchema(mock)
// => { userName: '', mobile: '', age: 0, active: false }
```

---

## validateSchema()

对 adapter 输出与期望 schema 进行 diff 校验，返回差异结果。

```ts
function validateSchema(id: string, data: unknown, schema: Schema): SchemaDiff
```

**示例（单元测试中使用）：**

```ts
import { validateSchema, hasDiff } from '@ai-request-guard/core'

const diff = validateSchema('getUserDetailAdapter', adapterOutput, expectedSchema)
expect(hasDiff(diff)).toBe(false)
```

---

## hasDiff()

判断 SchemaDiff 是否包含需要关注的差异（`missingFields` 或 `typeMismatches` 不为空）。`extraFields` 不计入差异。

```ts
function hasDiff(diff: SchemaDiff): boolean
```

---

## getDiffRecords()

获取当前内存中所有已收集的 schema diff 记录（快照副本）。

```ts
function getDiffRecords(): SchemaDiff[]
```

---

## clearDiffRecords()

清空内存中的 diff 记录，主要用于测试环境重置。

```ts
function clearDiffRecords(): void
```

---

## 类型定义(TS)

### RegisterOptions

```ts
interface RegisterOptions<T = unknown> {
  adapter: AdapterFn<T>
  viewSchema?: unknown | (() => unknown)
}
```

### GuardOptions

```ts
interface GuardOptions<T = unknown> {
  adapter: AdapterFn<T>
  request: () => Promise<unknown>
  mode?: GuardMode
}
```

### GuardConfig

```ts
interface GuardConfig {
  mode?: GuardMode  // 'real' | 'mock'
  dev?: boolean
}
```

### Schema

```ts
type Schema = Record<string, unknown>
```

字段值只用于推断期望类型：`0` → number，`''` → string，`[]` → array，`{}` → object。

### AdapterFn

```ts
type AdapterFn<T = unknown> = (raw: unknown) => T
```

### GuardMode

```ts
type GuardMode = 'real' | 'mock'
```

### SchemaDiff

```ts
interface SchemaDiff {
  id: string
  missingFields: string[]
  extraFields: string[]
  typeMismatches: Array<{
    field: string
    expected: string
    actual: string
  }>
}
```
