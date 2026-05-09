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
| `options.ai` | `AIGuardAIOptions` | — | AI provider 配置，配置后启用 Adapter Generator GUI（仅 dev 环境） |
| `options.fileType` | `'ts' \| 'js'` | `'ts'` | 生成文件的扩展名 |
| `options.guiPort` | `number` | devPort + 1 | GUI 管理界面端口，默认 devServer 端口 + 1 |

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

  /**
   * AI provider 配置，配置后启用 Adapter Generator GUI（仅 dev 环境）。
   */
  ai?: AIGuardAIOptions

  /**
   * 生成文件的扩展名。
   * @default 'ts'
   */
  fileType?: 'ts' | 'js'

  /**
   * GUI 管理界面端口。不填时自动取 devServer 端口 + 1（如有冲突则继续 +1 探测）。
   */
  guiPort?: number
}

interface AIGuardAIOptions {
  /** AI provider 类型 */
  provider: 'openai-compatible' | 'anthropic'
  /** openai-compatible 模式必填：API 基础地址 */
  baseURL?: string
  /** API 密钥（仅存于 Node 层，不进浏览器） */
  apiKey: string
  /** 模型名称（openai-compatible 默认 'deepseek-chat'） */
  model?: string
  /** 最大输出 token 数，默认 2000 */
  maxTokens?: number
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

## Adapter Generator GUI

配置 `ai` 选项后，插件在**独立端口**启动 GUI 管理页面（与 Vite devServer 同进程，不占用宿主 devServer 端口）。dev 服务启动后，终端会打印访问地址：

```
  ➜  AIRequestGuard GUI:  http://localhost:5174
```

> 端口默认为 devServer 端口 + 1，被占用时自动 +1 探测，也可通过 `guiPort` 手动指定。

### 使用流程

1. 打开终端打印的 GUI 地址
2. 填写 **Adapter ID**（对应最终的 register id，如 `user-detail`）
3. 粘贴 **Mock JSON**（前端期望的数据结构，即后端原始格式）
4. 粘贴 **Raw JSON**（后端真实返回数据）
5. 点击「生成 Adapter」，等待 AI 返回带置信度标注的 adapter 草稿
6. 点击「复制代码」粘贴到项目文件，或点击「写入文件」直接写入

### 置信度标注

| 标注 | 含义 | 建议操作 |
|------|------|---------|
| `// ✅` | 字段名精确匹配或驼峰-下划线转换，类型一致 | 可直接使用 |
| `// ❓` | 语义相似但名称不同，需人工确认 | 核对后使用 |
| `// ❌` | 未找到对应字段，已留空 | 手动填写 |

### 配置示例

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [
    aiRequestGuardPlugin({
      ai: {
        provider: 'openai-compatible',
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_KEY,
        model: 'deepseek-chat',
      },
      fileType: 'ts',
    }),
  ],
})
```

::: tip 未配置 ai 时的降级
未配置 `ai` 选项时，`/__ai-guard` 页面仍可访问，但生成按钮禁用，提示"未配置 AI provider"。
:::

::: warning apiKey 安全
`apiKey` 只存在于 Vite 插件的 Node 层（devServer），不会进入浏览器产物。生产构建时插件通过 `apply: 'serve'` 自动隔离，GUI 完全不存在。
:::

---

## devServer 端点

插件在 Vite devServer 上注册以下端点（仅开发环境）：

### GET /（GUI 独立端口根路径）

返回 Adapter Generator GUI 页面（HTML）。需配置 `ai` 选项；未配置时页面仍可访问但生成功能禁用。

### POST /generate（GUI 独立端口）

调用 AI 生成 adapter 初稿。请求体：

```ts
{ id: string; mock: Record<string, unknown>; raw: Record<string, unknown> }
```

响应体：

```ts
{ code: string; warnings: string[]; confidence: number }
```

`code` 为带置信度标注的 `AIRequestGuard.register(...)` 调用代码字符串；`warnings` 列出 schema 中未能匹配的字段；`confidence` 为 0–1 的整体置信度。

### POST /infer-schema（GUI 独立端口）

根据 mock 数据推导 schema 结构。请求体：

```ts
{ mock: Record<string, unknown> }
```

响应体：

```ts
{ schema: Record<string, unknown> }
```

### POST /__ai-guard/report（宿主 devServer）

接收浏览器端 schema diff 上报。请求体为 `SchemaDiff[]` JSON 数组。由虚拟模块自动调用，无需手动操作。需启用 `reporting: true`。

### POST /__ai-guard/raw（宿主 devServer）

接收 fetch 拦截器上报的原始响应数据快照。请求体格式：

```ts
{
  url: string    // 请求 URL
  method: string // HTTP 方法
  raw: unknown   // 响应 JSON 数据
}
```

需启用 `reporting: true`。

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
