# @ai-request-guard/webpack-plugin

适用于 Vue CLI 4 / webpack 4+ 项目的 AIRequestGuard 插件，提供与 `@ai-request-guard/vite-plugin` 相同的 HTML 差异报告功能。

## 安装

::: code-group

```bash [npm]
npm install -D @ai-request-guard/webpack-plugin
```

```bash [yarn]
yarn add -D @ai-request-guard/webpack-plugin
```

```bash [pnpm]
pnpm add -D @ai-request-guard/webpack-plugin
```

:::

## 配置插件（vue.config.js）

::: warning Vue CLI 4 / webpack-dev-server v3 注意事项
Vue CLI 4 中 devServer 实例在 webpack 插件执行**之前**已完成初始化，插件无法自动注入中间件。
必须将插件实例提取到变量，并在 `devServer.before` 中**手动调用** `plugin.applyMiddlewares(app)`。
:::

::: code-group

```js [JS]
// vue.config.js
const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')

// 1. 提取为变量，devServer.before 中需要引用同一个实例
const aiGuardPlugin = new AIGuardWebpackPlugin({ reporting: true })

module.exports = {
  configureWebpack: {
    plugins: [aiGuardPlugin],
  },
  devServer: {
    // 2. 手动注册 devServer 端点（Vue CLI 4 必须）
    before(app) {
      aiGuardPlugin.applyMiddlewares(app)
    },
  },
}
```

```ts [TS]
// vue.config.js
import { AIGuardWebpackPlugin } from '@ai-request-guard/webpack-plugin'
import { defineConfig } from '@vue/cli-service'

// 1. 提取为变量，devServer.before 中需要引用同一个实例
const aiGuardPlugin = new AIGuardWebpackPlugin({ reporting: true })

export default defineConfig({
  configureWebpack: {
    plugins: [aiGuardPlugin],
  },
  devServer: {
    // 2. 手动注册 devServer 端点（Vue CLI 4 必须）
    before(app: any) {
      aiGuardPlugin.applyMiddlewares(app)
    },
  },
})
```

:::

## 引入浏览器端模块 <Badge type="danger" text="必须" />

在应用入口文件中引入 `report-sink`，安装 fetch 拦截器和自动上报逻辑。**此步骤不可省略**，否则 diff 数据不会上报，报告文件不会生成。

::: code-group

```js [JS]
// main.js
if (process.env.NODE_ENV === 'development') {
  import('@ai-request-guard/webpack-plugin/report-sink')
}
```

```ts [TS]
// main.ts
if (process.env.NODE_ENV === 'development') {
  import('@ai-request-guard/webpack-plugin/report-sink')
}
```

:::

或者通过 `vue.config.js` 注入到 webpack entry（推荐，确保最早执行）：

::: code-group

```js [JS]
// vue.config.js
const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')

module.exports = {
  configureWebpack: (config) => {
    if (process.env.NODE_ENV === 'development') {
      // entry key 取决于项目配置：
      //   未使用 pages 时默认为 'app'
      //   使用 pages 时 key 与 pages 中定义的名称一致，例如 'index'
      Object.keys(config.entry).forEach((key) => {
        config.entry[key] = [
          '@ai-request-guard/webpack-plugin/report-sink',
          ...config.entry[key],
        ]
      })
    }
    return {
      plugins: [new AIGuardWebpackPlugin({ reporting: true })],
    }
  },
}
```

```ts [TS]
// vue.config.js
import { AIGuardWebpackPlugin } from '@ai-request-guard/webpack-plugin'
import { defineConfig } from '@vue/cli-service'

export default defineConfig({
  configureWebpack: (config) => {
    if (process.env.NODE_ENV === 'development') {
      // entry key 取决于项目配置：
      //   未使用 pages 时默认为 'app'
      //   使用 pages 时 key 与 pages 中定义的名称一致，例如 'index'
      Object.keys((config as any).entry).forEach((key) => {
        ;(config as any).entry[key] = [
          '@ai-request-guard/webpack-plugin/report-sink',
          ...(config as any).entry[key],
        ]
      })
    }
    return {
      plugins: [new AIGuardWebpackPlugin({ reporting: true })],
    }
  },
})
```

:::

## 注册 URL 监听规则

与 Vite 项目完全相同，在 `main.js` 中注册 watch 规则：

::: code-group

```js [JS]
import AIRequestGuard from '@ai-request-guard/core'

AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch('/api/order/list', 'order-list')
```

```ts [TS]
import AIRequestGuard from '@ai-request-guard/core'

AIRequestGuard.watch('/api/user/detail', 'user-detail')
AIRequestGuard.watch('/api/order/list', 'order-list')
```

:::

## 查看报告

触发请求后，webpack-dev-server 会在项目根目录生成 `ai-request-guard-report.html`，双击用浏览器打开即可。

::: warning 报告未生成？先检查这两步
上报链路由**两部分**共同组成，缺一不可：

| 步骤 | 作用 | 遗漏后果 |
|------|------|---------|
| `new AIGuardWebpackPlugin({ reporting: true })` | 在 devServer 注册接收端点 | 数据无处可达，报告不更新 |
| 引入 `report-sink`（main.js 或 entry） | 在浏览器端安装 diff 上报逻辑 | diff 数据从未发出，报告永远为空 |

**最常见的漏配**：只加了插件，忘记在入口引入 `report-sink`。

验证方法：访问会触发目标接口的页面，然后**切换到其他标签页**（触发 `visibilitychange`）或关闭页面（触发 `beforeunload`），再检查项目根目录是否有报告文件生成。
:::

---

## AIGuardWebpackPluginOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `options.reporting` | `boolean` | `false` | 是否启用上报功能 |
| `options.outFile` | `string` | `'ai-request-guard-report.html'` | 报告文件输出路径，相对于项目根目录 |
| `options.methods` | `string[]` | `['GET']` | 拦截的 HTTP 方法列表 |
| `options.ai` | `AIGuardAIOptions` | — | AI provider 配置，配置后启用 Adapter Generator GUI（仅 dev 环境） |
| `options.fileType` | `'ts' \| 'js'` | `'ts'` | 生成文件的扩展名 |
| `options.guiPort` | `number` | devPort + 1 | GUI 管理界面端口，默认 devServer 端口 + 1 |

```ts
interface AIGuardWebpackPluginOptions {
  /**
   * 是否启用自动上报功能。
   * 设为 true 后才会安装 fetch 拦截器并启动 devServer 端点。
   * @default false
   */
  reporting?: boolean

  /**
   * 报告文件输出路径，相对于项目根目录。
   * @default 'ai-request-guard-report.html'
   */
  outFile?: string

  /**
   * 拦截的 HTTP 方法列表。
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

## Adapter Generator GUI

配置 `ai` 选项后，插件在**独立端口**启动 GUI 管理页面（与 webpack-dev-server 同进程，不占用宿主 devServer 端口）。dev 服务启动后，终端会打印访问地址：

```
  ➜  AIRequestGuard GUI:  http://localhost:8081
```

> 端口默认为 devServer 端口 + 1，被占用时自动 +1 探测，也可通过 `guiPort` 手动指定。

### 配置示例

```js
// vue.config.js
const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')

const aiGuardPlugin = new AIGuardWebpackPlugin({
  reporting: true,
  ai: {
    provider: 'openai-compatible',
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
    model: 'deepseek-chat',
  },
  fileType: 'ts',
})
```

使用方式与置信度标注说明与 [vite-plugin GUI 章节](/api/vite-plugin#adapter-generator-gui) 完全相同。

---

## devServer 端点

插件在两个服务上注册端点（仅开发环境）：

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

接收浏览器端 schema diff 上报。请求体为 `SchemaDiff[]` JSON 数组。由 `report-sink` 自动调用，无需手动操作。需启用 `reporting: true`。

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

## 环境兼容性

### Node.js

| 版本 | 支持 |
|------|------|
| Node 18.x+ | ✅ 推荐（支持原生 fetch，AI 功能可用） |
| Node 16.x | ⚠️ 基础功能（reporting）可用，`ai` 选项不可用（缺少原生 fetch） |
| Node 14.x 及以下 | ❌ 不支持 |

> 不配置 `ai` 选项时，插件仅依赖 `fs`、`path` 等内置模块，Node 16 可用。配置 `ai` 选项后需要原生 `fetch`（Node 18+）。

### webpack-dev-server 版本兼容性

| 版本 | Vue CLI | 钩子 |
|------|---------|------|
| v3   | Vue CLI 4 | `devServer.before` |
| v4   | Vue CLI 5 | `devServer.setupMiddlewares` |

插件自动检测并适配两个版本，无需手动区分。
