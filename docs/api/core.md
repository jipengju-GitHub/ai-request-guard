# @ai-request-guard/core

## AIRequestGuard()

主函数，发起请求并经过 adapter 转换后返回 ViewModel。

```ts
function AIRequestGuard<T = unknown>(options: GuardOptions<T>): Promise<T>
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `options.id` | `string` | ✅ | 接口唯一 ID，用于关联已注册的 adapter |
| `options.request` | `() => Promise<unknown>` | ✅ | 发起真实请求的函数，mock 模式下不会被调用 |
| `options.schema` | `Schema` | — | 期望的 ViewModel 结构，dev 模式下用于 diff 校验 |
| `options.mode` | `'real' \| 'mock'` | — | 单接口模式，优先级高于全局 mode |
| `options.mockData` | `unknown \| (id: string) => unknown` | — | mock 模式下的本地数据，会经过 adapter 转换 |

**示例：**

::: code-group

```js [JS]
const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  schema: { id: 0, userName: '', mobile: '' },
})
```

```ts [TS]
const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  schema: { id: 0, userName: '', mobile: '' },
})
```

:::

---

## AIRequestGuard.register()

注册 adapter。adapter 是一个纯函数，将后端 DTO 映射为前端 ViewModel。

```ts
AIRequestGuard.register<T>(id: string, fn: AdapterFn<T>): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 接口唯一 ID |
| `fn` | `(raw: unknown) => T` | 转换函数 |

**示例：**

::: code-group

```js [JS]
AIRequestGuard.register('user-detail', (raw) => {
  return {
    id: raw.user_id,
    userName: raw.username ?? '',
  }
})
```

```ts [TS]
AIRequestGuard.register('user-detail', (raw) => {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
  }
})
```

:::

::: tip
建议在应用初始化时集中注册所有 adapter，与 API 请求函数放在同一模块。
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

::: code-group

```js [JS]
AIRequestGuard.configure({ dev: true, mode: 'mock' })
```

```ts [TS]
AIRequestGuard.configure({ dev: true, mode: 'mock' })
```

:::

---

## AIRequestGuard.setMode()

切换全局请求模式的快捷方法。

```ts
AIRequestGuard.setMode(mode: 'real' | 'mock'): void
```

**示例：**

::: code-group

```js [JS]
AIRequestGuard.setMode('mock') // 全局使用 mock
AIRequestGuard.setMode('real') // 恢复真实请求
```

```ts [TS]
AIRequestGuard.setMode('mock') // 全局使用 mock
AIRequestGuard.setMode('real') // 恢复真实请求
```

:::

---

## AIRequestGuard.watch()

注册真实请求拦截规则（仅 dev 构建生效）。当 fetch 发出的请求 URL 匹配 `pattern` 时，响应 raw data 会自动上报给 devServer。

```ts
AIRequestGuard.watch(pattern: string | RegExp, id: string): void
```

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `pattern` | `string \| RegExp` | URL 匹配规则：字符串为包含匹配，正则为完整匹配 |
| `id` | `string` | 对应的 adapter id，需已通过 `register()` 注册 |

**示例：**

::: code-group

```js [JS]
AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch(/\/api\/order\/\d+/, 'order-detail')
```

```ts [TS]
AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch(/\/api\/order\/\d+/, 'order-detail')
```

:::

---

## AIRequestGuard.clearWatch()

清空所有 watch 规则，主要用于测试环境重置。

```ts
AIRequestGuard.clearWatch(): void
```

---

## validateSchema()

对 adapter 输出与期望 schema 进行 diff 校验，返回差异结果。

```ts
function validateSchema(id: string, data: unknown, schema: Schema): SchemaDiff
```

**示例（单元测试中使用）：**

::: code-group

```js [JS]
import { validateSchema, hasDiff } from '@ai-request-guard/core'

const diff = validateSchema('user-detail', adapterOutput, expectedSchema)
expect(hasDiff(diff)).toBe(false)
```

```ts [TS]
import { validateSchema, hasDiff } from '@ai-request-guard/core'

const diff = validateSchema('user-detail', adapterOutput, expectedSchema)
expect(hasDiff(diff)).toBe(false)
```

:::

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

### GuardOptions

```ts
interface GuardOptions<T = unknown> {
  id: string
  request: () => Promise<unknown>
  schema?: Schema
  mode?: GuardMode
  mockData?: unknown | ((id: string) => unknown)
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
