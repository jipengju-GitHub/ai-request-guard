# 真实请求拦截

真实请求拦截功能可以在不修改业务请求代码的前提下，自动捕获 GET 接口的原始响应，并配合 Vite 插件生成 HTML 差异报告。

::: info 适用场景
- 前后端联调时快速发现接口字段变化
- 周期性回归检查，验证 adapter 映射是否仍与后端对齐
- 不侵入业务代码，不影响生产环境
:::

## 工作原理

```
fetch('/api/user/detail')
       ↓
window.fetch 拦截器（interceptor.ts）
       ↓ 匹配到 watch 规则
response.clone().json()
       ↓
navigator.sendBeacon('/__ai-guard/raw', raw)
       ↓
Vite devServer 中间件（/__ai-guard/raw）
       ↓ 通过 adapter 函数名匹配注册信息
写入 rawRecords，重新生成 HTML 报告
```

## 安装 Vite 插件

::: code-group

```js [JS]
// vite.config.js
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [
    aiRequestGuardPlugin({
      reporting: true,
      outFile: 'ai-request-guard-report.html', // 报告输出路径，相对于项目根目录
      methods: ['GET'],                          // 拦截的 HTTP 方法，默认只拦截 GET
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
      reporting: true,
      outFile: 'ai-request-guard-report.html', // 报告输出路径，相对于项目根目录
      methods: ['GET'],                          // 拦截的 HTTP 方法，默认只拦截 GET
    }),
  ],
})
```

:::

## 引入虚拟模块

在应用入口文件中引入虚拟模块，安装页面卸载时的自动上报逻辑：

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

该模块会在 `visibilitychange` 和 `beforeunload` 事件时自动把内存中的 schema diff 记录 POST 到 `/__ai-guard/report`。

TypeScript 项目需要声明模块类型：

```ts
// env.d.ts
declare module 'virtual:ai-request-guard/report-sink' {
  export function flushReport(): void
}
```

## 注册 URL 监听规则

::: code-group

```js [JS]
// main.js（注册部分）
import AIRequestGuard from '@ai-request-guard/core'
 import { getUserDetailAdapter, getOrderDetailAdapter, getOrderListAdapter } from './adapters'

// 字符串：URL 包含匹配
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)

// 正则：精确控制匹配规则
AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)

// 列表接口
AIRequestGuard.watch('/api/order/list', getOrderListAdapter)
```

```ts [TS]
// main.ts（注册部分）
import AIRequestGuard from '@ai-request-guard/core'
 import { getUserDetailAdapter, getOrderDetailAdapter, getOrderListAdapter } from './adapters'

// 字符串：URL 包含匹配
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)

// 正则：精确控制匹配规则
AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)

// 列表接口
AIRequestGuard.watch('/api/order/list', getOrderListAdapter)
```

:::

`watch(pattern, adapter)` 的第二个参数是已通过 `AIRequestGuard.register()` 注册的 adapter 函数引用。

## 触发拦截

注册好规则后，只需正常发起 fetch 请求（无需通过 `AIRequestGuard()` 包裹）：

::: code-group

```js [JS]
// 直接 fetch，拦截器自动捕获
const res = await fetch('/api/user/detail')
const data = await res.json()
```

```ts [TS]
// 直接 fetch，拦截器自动捕获
const res = await fetch('/api/user/detail')
const data = await res.json()
```

:::

或者通过 `AIRequestGuard()` 发起的真实请求也会被捕获：

::: code-group

```js [JS]
const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})
```

```ts [TS]
const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})
```

:::

## 查看报告

触发请求后，Vite devServer 会在项目根目录生成（或更新）`ai-request-guard-report.html`。双击用浏览器打开：

- **绿色 ✓**：adapter 输出与 schema 完全匹配
- **橙色 ⚠**：存在缺失字段或类型不匹配
- 点击展开条目可查看具体差异和原始字段列表

## 只拦截查询接口

::: tip 设计说明
拦截功能面向**查询类接口（GET）**，增删改接口（POST/PUT/DELETE）的响应结构通常无需映射，无需注册 watch 规则。

如需拦截其他方法，可通过 Vite 插件的 `methods` 选项配置：

::: code-group

```js [JS]
aiRequestGuardPlugin({ methods: ['GET', 'POST'] })
```

```ts [TS]
aiRequestGuardPlugin({ methods: ['GET', 'POST'] })
```

:::

但建议保持默认的 `['GET']`，避免非查询接口的响应数据干扰报告。
:::

## 手动触发上报

如果需要立即刷新报告（无需等待页面切换），可手动调用：

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
