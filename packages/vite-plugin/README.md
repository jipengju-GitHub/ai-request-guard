# @ai-request-guard/vite-plugin

AIRequestGuard 的 Vite 插件。在开发服务器上提供真实请求拦截端点，自动生成 HTML 差异报告。

## 安装

```bash
pnpm add -D @ai-request-guard/vite-plugin
```

## 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [
    aiRequestGuardPlugin({
      outFile: 'ai-request-guard-report.html', // 默认值
      methods: ['GET'],                          // 默认值
    }),
  ],
})
```

## 接入虚拟模块

```typescript
// main.ts
import 'virtual:ai-request-guard/report-sink'
```

引入后自动安装 `window.fetch` 拦截器，并在页面切换 / 关闭时批量上报 schema diff 记录。

TypeScript 类型声明：

```typescript
// env.d.ts
declare module 'virtual:ai-request-guard/report-sink' {
  export function flushReport(): void
}
```

## 完整接入示例

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default defineConfig({
  plugins: [aiRequestGuardPlugin()],
})
```

```typescript
// main.ts
import AIRequestGuard from '@ai-request-guard/core'
import 'virtual:ai-request-guard/report-sink'

// 定义并注册 adapter
function getUserDetailAdapter(raw: unknown) {
  const r = raw as Record<string, unknown>
  return { id: r.user_id as number, userName: r.username as string }
}
AIRequestGuard.register({ adapter: getUserDetailAdapter })

// 注册 URL 监听规则
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
```

触发一次 `GET /api/user/detail` 请求后，项目根目录会生成 `ai-request-guard-report.html`。

## 选项

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `outFile` | `string` | `'ai-request-guard-report.html'` | 报告文件路径，相对于项目根目录 |
| `methods` | `string[]` | `['GET']` | 需要拦截的 HTTP 方法 |

## devServer 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `/__ai-guard/report` | POST | 接收 schema diff 记录（`SchemaDiff[]`）|
| `/__ai-guard/raw` | POST | 接收 fetch 拦截器上报的原始响应数据 |

## License

MIT
