# AIRequestGuard

前端防腐层 SDK。用 Adapter 模式将后端 DTO 与前端 ViewModel 彻底解耦，让接口字段重命名、结构调整不再影响视图代码。

## 包结构

| 包 | 说明 |
|---|---|
| [`@ai-request-guard/core`](./packages/core) | 核心运行时：adapter 注册、mock、schema 校验 |
| [`@ai-request-guard/vite-plugin`](./packages/vite-plugin) | Vite 插件：真实请求拦截 + HTML 差异报告 |

## 快速上手

```bash
pnpm add @ai-request-guard/core
pnpm add -D @ai-request-guard/vite-plugin  # 可选，Vite 项目使用
```

```typescript
import AIRequestGuard from '@ai-request-guard/core'

// 1. 注册 adapter：后端 DTO → 前端 ViewModel
AIRequestGuard.register('user-detail', (raw) => {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    age: Number(r.age ?? 0),
  }
})

// 2. 发起请求，自动经过 adapter 转换
const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user/detail').then(r => r.json()),
  schema: { id: 0, userName: '', mobile: '', age: 0 },
})

console.log(user.userName) // ViewModel 字段，不受后端字段名变化影响
```

## 本地开发

```bash
pnpm install
pnpm dev          # 启动 playground
pnpm docs:dev     # 启动文档站
pnpm build:all    # 构建所有包
```

## 文档

详细用法见 [AI-Request-Guard/](https://guard.pennji.cn) 目录，或运行 `pnpm docs:dev` 在本地浏览。

## License

MIT
