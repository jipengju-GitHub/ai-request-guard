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

::: code-group

```js [JS]
// vue.config.js
const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')

module.exports = {
  configureWebpack: {
    plugins: [
      new AIGuardWebpackPlugin({
        reporting: true,                           // 启用上报功能（默认关闭）
        outFile: 'ai-request-guard-report.html',   // 报告输出路径
        methods: ['GET'],                           // 拦截的 HTTP 方法
      }),
    ],
  },
}
```

```ts [TS]
// vue.config.js
import { AIGuardWebpackPlugin } from '@ai-request-guard/webpack-plugin'
import { defineConfig } from '@vue/cli-service'

export default defineConfig({
  configureWebpack: {
    plugins: [
      new AIGuardWebpackPlugin({
        reporting: true,
        outFile: 'ai-request-guard-report.html',
        methods: ['GET'],
      }),
    ],
  },
})
```

:::

## 引入浏览器端模块

在应用入口文件中引入 `report-sink`，安装 fetch 拦截器和自动上报逻辑：

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
      const entry = config.entry.app
      config.entry.app = [
        '@ai-request-guard/webpack-plugin/report-sink',
        ...entry,
      ]
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
      const entry = (config as any).entry.app
      ;(config as any).entry.app = [
        '@ai-request-guard/webpack-plugin/report-sink',
        ...entry,
      ]
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
