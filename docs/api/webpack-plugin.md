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
}
```

## 环境兼容性

### Node.js

| 版本 | 支持 |
|------|------|
| Node 14.x+ | ✅ 支持 |
| Node 12.x 及以下 | ❌ 不支持 |

> webpack 插件运行在构建工具侧（Node 环境），仅依赖 `fs`、`path` 等内置模块，无 `node:` 前缀，最低兼容 **Node 14.0**。

### webpack-dev-server 版本兼容性

| 版本 | Vue CLI | 钩子 |
|------|---------|------|
| v3   | Vue CLI 4 | `devServer.before` |
| v4   | Vue CLI 5 | `devServer.setupMiddlewares` |

插件自动检测并适配两个版本，无需手动区分。
