# 安装与配置

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
import { getUserDetailAdapter } from './adapters/userAdapter'

const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})

console.log(user.userName) // 已映射为 ViewModel 字段
```

```ts [TS]
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

module.exports = {
  configureWebpack: {
    plugins: [new AIGuardWebpackPlugin({ reporting: true })],
  },
}
```

```ts [TS]
// vue.config.js
import { AIGuardWebpackPlugin } from '@ai-request-guard/webpack-plugin'
import { defineConfig } from '@vue/cli-service'

export default defineConfig({
  configureWebpack: {
    plugins: [new AIGuardWebpackPlugin({ reporting: true })],
  },
})
```

:::

在入口文件引入 `report-sink`，启用真实请求拦截：

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
