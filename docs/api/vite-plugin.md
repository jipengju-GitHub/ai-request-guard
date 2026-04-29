# @ai-request-guard/vite-plugin

## 环境兼容性

### Node.js

| 版本 | 支持 |
|------|------|
| Node 18.x+ | ✅ 推荐 |
| Node 20.x / 22.x | ✅ 支持 |
| Node 16.x | ⚠️ 取决于 Vite 版本（Vite 5 要求 Node ≥ 18） |
| Node 14.x 及以下 | ❌ 不支持 |

> Vite 本身要求 **Node 18+**（Vite 5/6），vite-plugin 的 Node 版本下限与所使用的 Vite 版本一致。

---

## aiRequestGuardPlugin()

创建 Vite 插件实例。

```ts
function aiRequestGuardPlugin(options?: AIGuardVitePluginOptions): Plugin
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `options.reporting` | `boolean` | `false` | 是否启用上报功能；`false` 时虚拟模块为空操作，不会报错 |
| `options.outFile` | `string` | `'ai-request-guard-report.html'` | 报告文件输出路径，相对于项目根目录 |
| `options.methods` | `string[]` | `['GET']` | 拦截的 HTTP 方法列表 |

**示例：**

::: code-group

```js [JS]
// vite.config.js
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [
    aiRequestGuardPlugin({
      outFile: 'reports/api-diff.html',
      methods: ['GET'],
    }),
  ],
})
```

```ts [TS]
// vite.config.ts
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [
    aiRequestGuardPlugin({
      outFile: 'reports/api-diff.html',
      methods: ['GET'],
    }),
  ],
})
```

:::

---

## AIGuardVitePluginOptions

```ts
interface AIGuardVitePluginOptions {
  /**
   * 是否启用自动上报功能（fetch 拦截 + devServer 端点 + HTML 报告）。
   * 未启用时虚拟模块为空操作，不会报错。
   * @default false
   */
  reporting?: boolean

  /**
   * 报告文件输出路径，相对于项目根目录。
   * @default 'ai-request-guard-report.html'
   */
  outFile?: string

  /**
   * 拦截的 HTTP 方法，只有请求方法在此列表中时才会上报 raw 数据。
   * 建议只填查询类接口使用的方法，增删改接口不需要拦截。
   * @default ['GET']
   */
  methods?: string[]
}
```

---

## 虚拟模块：virtual:ai-request-guard/report-sink

引入后自动完成以下工作：

1. 安装 `window.fetch` 拦截器，将匹配 `methods` 的请求 raw 数据上报到 `/__ai-guard/raw`
2. 监听 `visibilitychange` 和 `beforeunload` 事件，批量上报内存中的 schema diff 记录到 `/__ai-guard/report`

::: code-group

```js [JS]
// main.js
import 'virtual:ai-request-guard/report-sink'
```

```ts [TS]
// main.ts
import 'virtual:ai-request-guard/report-sink'
```

:::

**导出的函数：**

### flushReport()

手动触发 schema diff 记录上报，无需等待页面切换。

::: code-group

```js [JS]
import { flushReport } from 'virtual:ai-request-guard/report-sink'

flushReport()
```

```ts [TS]
import { flushReport } from 'virtual:ai-request-guard/report-sink'

flushReport()
```

:::

**TypeScript 声明：**

```ts
// env.d.ts
declare module 'virtual:ai-request-guard/report-sink' {
  export function flushReport(): void
}
```

---

## devServer 端点

插件在 Vite devServer 上注册以下端点（仅开发环境）：

### POST /__ai-guard/report

接收浏览器端 schema diff 上报。请求体为 `SchemaDiff[]` JSON 数组。

由虚拟模块自动调用，无需手动操作。

### POST /__ai-guard/raw

接收 fetch 拦截器上报的原始响应数据快照请求体格式：

```ts
{
  url: string    // 请求 URL
  method: string // HTTP 方法
  raw: unknown   // 响应 JSON 数据
}
```

Node 端通过 `findIdByUrl()` 将 URL 匹配到 adapter id，记录原始字段列表（`Object.keys(raw)`）并重新生成报告。

---

## HTML 报告说明

报告为自包含的单文件 HTML（内联 CSS，无外部依赖），直接双击浏览器打开。

**报告内容：**

- **摘要面板**：有差异接口数 / 已检测接口总数 / 真实请求已采集数
- **接口列表表格**：每行显示接口 ID、URL、缺失字段数、类型不匹配数、多余字段数
- **差异详情**：仅展示有问题的接口，可折叠，包含原始字段列表和具体差异条目

**颜色编码：**

- 🟢 绿色：adapter 输出与 schema 完全匹配
- 🟠 橙色：存在缺失字段或类型不匹配，需要关注
