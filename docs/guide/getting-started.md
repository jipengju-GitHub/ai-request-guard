# 安装

## 为什么需要 AIRequestGuard？

在需求开发阶段，前后端往往基于约定的 Mock 数据并行开发。然而联调时，真实接口的字段命名、数据结构与 Mock 常常存在偏差，前端不得不逐处修改视图代码，严重时甚至触发模块级重写。对于中大型项目，这种**联调成本**往往是不可忽视的风险点。

AIRequestGuard 的设计理念是：**静态即终版，联调无重构**。

在防腐层中约定好 ViewModel 结构（`viewSchema`），adapter 函数负责将后端 DTO 映射到这个结构。无论后端字段如何变化，视图层始终面对稳定的 ViewModel，联调时只需更新 adapter，业务组件代码零改动。

引入 AI 能力后，adapter 的初稿可以由 GUI 工具自动生成——粘贴 Mock 数据和后端原始 JSON，AI 推导字段映射并输出代码，进一步压缩接入成本。

## 安装

::: code-group

```bash [pnpm]
pnpm add @ai-request-guard/core
```

```bash [npm]
npm install @ai-request-guard/core
```

```bash [yarn]
yarn add @ai-request-guard/core
```

:::

差异报告能力可通过构建工具插件获得，根据项目使用的构建工具选择对应插件安装：

::: code-group

```bash [Vite (pnpm)]
pnpm add -D @ai-request-guard/vite-plugin
```

```bash [Vite (npm)]
npm install -D @ai-request-guard/vite-plugin
```

```bash [webpack / Vue CLI 4 (pnpm)]
pnpm add -D @ai-request-guard/webpack-plugin
```

```bash [webpack / Vue CLI 4 (npm)]
npm install -D @ai-request-guard/webpack-plugin
```

:::

## 5 分钟快速上手

### 1. 编写并注册 Adapter

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

### 2. 发起请求

应用层只需传入 adapter 函数引用，支持 IDE Cmd/Ctrl+Click 直接跳转到防腐层文件：

::: code-group

```js [JS]
import AIRequestGuard from '@ai-request-guard/core'
import { getUserDetailAdapter } from './adapters/userAdapter'

const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})

console.log(user.userName) // 已映射为 ViewModel 字段
```

```ts [TS]
import AIRequestGuard from '@ai-request-guard/core'
import { getUserDetailAdapter } from './adapters/userAdapter'

const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})

console.log(user.userName) // 已映射为 ViewModel 字段
```

:::

### 3. 配置构建插件（可选）

启用插件后，开发服务器会自动收集 schema diff 并生成 HTML 报告。

#### Vite 项目

在 `vite.config.js` 中添加插件：

::: code-group

```js [JS]
// vite.config.js
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [aiRequestGuardPlugin({ reporting: true })],
})
```

```ts [TS]
// vite.config.ts
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [aiRequestGuardPlugin({ reporting: true })],
})
```

:::

在入口文件引入虚拟模块，启用真实请求拦截：

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

TypeScript 项目需要在 `env.d.ts` 添加类型声明：

```ts
// env.d.ts
declare module 'virtual:ai-request-guard/report-sink' {
  export function flushReport(): void
}
```

#### webpack / Vue CLI 4 项目

在 `vue.config.js` 中添加插件：

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

### 4. 注册 URL 监听规则

::: code-group

```js [JS]
import { getUserDetailAdapter } from './adapters/userAdapter'

// 当 fetch 请求匹配到 /api/user/detail 时，自动上报 raw 数据
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
```

```ts [TS]
import { getUserDetailAdapter } from './adapters/userAdapter'

// 当 fetch 请求匹配到 /api/user/detail 时，自动上报 raw 数据
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
```

:::

触发一次真实 GET 请求后，项目根目录会生成 `ai-request-guard-report.html`，双击浏览器打开即可查看差异报告。

## AI 生成 Adapter

手写 adapter 有一定学习成本，尤其在字段较多、命名差异大时。**Adapter Generator GUI**：配置 AI provider 后，在 GUI 页面粘贴 mock 数据和后端原始数据，即可自动生成带置信度标注的 adapter 初稿。

详见 [AI Adapter 生成指南](/guide/ai-adapter)。

## 全局配置

::: code-group

```js [JS]
AIRequestGuard.configure({
  dev: true,    // 手动开启开发模式（默认跟随 NODE_ENV 自动判断）
  mode: 'real', // 全局默认请求模式：'real' | 'mock'
})
```

```ts [TS]
AIRequestGuard.configure({
  dev: true,    // 手动开启开发模式（默认跟随 NODE_ENV 自动判断）
  mode: 'real', // 全局默认请求模式：'real' | 'mock'
})
```

:::

::: tip
`dev` 模式下会输出 schema diff 警告；生产构建中所有 dev 分支代码会被 tree-shake。
:::
