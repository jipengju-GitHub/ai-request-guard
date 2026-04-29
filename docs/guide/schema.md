# Schema 校验

Schema 校验是 AIRequestGuard 的开发辅助机制。在 dev 模式下，它会对比 adapter 的输出结果与预期的 ViewModel 结构，提前发现字段缺失、类型不匹配等问题。

::: warning 仅开发环境
Schema 校验逻辑只在 `dev: true` 时执行，生产构建中不产生任何运行时开销。
:::

## 传入 Schema

在调用 `AIRequestGuard()` 时传入 `schema` 选项，描述期望的 ViewModel 形状（字段名 + 值类型示例）：

::: code-group

```js [JS]
const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  schema: {
    id: 0,           // number
    userName: '',    // string
    mobile: '',      // string
    deptId: 0,       // number
    deptName: '',    // string
    age: 0,          // number
    avatar: '',      // string
    createTime: '',  // string
  },
})
```

```ts [TS]
const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  schema: {
    id: 0,           // number
    userName: '',    // string
    mobile: '',      // string
    deptId: 0,       // number
    deptName: '',    // string
    age: 0,          // number
    avatar: '',      // string
    createTime: '',  // string
  },
})
```

:::

Schema 的**值**只用来推断期望类型，不作为默认值。写 `0` 表示期望 `number`，写 `''` 表示期望 `string`，写 `[]` 表示期望 `array`。

## 三种差异类型

### 缺失字段（missingFields）

Schema 中定义了但 adapter 输出中不存在的字段。**会触发 Console 警告。**

```
[AIRequestGuard] Schema diff detected for "user-detail":
  missingFields: ["email", "phone"]
```

通常原因：adapter 尚未映射该字段，或字段名拼写错误。

### 类型不匹配（typeMismatches）

字段存在但类型与期望不符。**会触发 Console 警告。**

```
[AIRequestGuard] Schema diff detected for "user-detail":
  typeMismatches: [{ field: "age", expected: "number", actual: "string" }]
```

通常原因：忘记做类型转换（如 `Number(r.age)`）。

### 多余字段（extraFields）

Adapter 输出了 schema 中未定义的字段。**不触发警告**，属于 adapter 主动补充的字段，通常是预期行为（如默认值补齐的 `avatar`）。

## 查看完整差异报告

配合 Vite 插件使用时，所有 schema diff 会被汇总到 HTML 报告中。详见[真实请求拦截](./interceptor)。

## Schema 定义技巧

::: code-group

```js [JS]
// 数组类型：值写空数组
const schema1 = {
  total: 0,
  items: [],     // 期望 array 类型
}

// 对象类型：值写空对象
const schema2 = {
  user: {},      // 期望 object 类型
}

// 可以只写关注的字段，不必涵盖所有字段
// adapter 输出中多出的字段会记录为 extraFields 但不报警
const schema3 = {
  id: 0,
  userName: '',
  // 其他字段不写也可以
}
```

```ts [TS]
// 数组类型：值写空数组
const schema1 = {
  total: 0,
  items: [],     // 期望 array 类型
}

// 对象类型：值写空对象
const schema2 = {
  user: {},      // 期望 object 类型
}

// 可以只写关注的字段，不必涵盖所有字段
// adapter 输出中多出的字段会记录为 extraFields 但不报警
const schema3 = {
  id: 0,
  userName: '',
  // 其他字段不写也可以
}
```

:::

## 在测试中断言 Schema

如果你有单元测试，也可以直接使用 `validateSchema` 做断言：

::: code-group

```js [JS]
import { validateSchema, hasDiff } from '@ai-request-guard/core'

const viewModel = myAdapter(rawData)
const diff = validateSchema('user-detail', viewModel, expectedSchema)

expect(hasDiff(diff)).toBe(false)
expect(diff.missingFields).toEqual([])
expect(diff.typeMismatches).toEqual([])
```

```ts [TS]
import { validateSchema, hasDiff } from '@ai-request-guard/core'

const viewModel = myAdapter(rawData)
const diff = validateSchema('user-detail', viewModel, expectedSchema)

expect(hasDiff(diff)).toBe(false)
expect(diff.missingFields).toEqual([])
expect(diff.typeMismatches).toEqual([])
```

:::
