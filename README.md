# AIRequestGuard

前端防腐层 SDK。用 Adapter 模式将后端 DTO 与前端 ViewModel 彻底解耦，让接口字段重命名、结构调整不再影响视图代码。

**AI Adapter 生成**：配置 AI provider 后，在 GUI 管理界面粘贴 mock 数据和后端原始 JSON，一键生成带置信度标注的 adapter 初稿。

📖 **文档**：[guard.pennji.cn](https://guard.pennji.cn)　　🎮 **Playground**：[guard.pennji.cn/playground](https://guard.pennji.cn/playground/)

## 包结构

| 包 | 说明 |
|---|---|
| [`@ai-request-guard/core`](./packages/core) | 核心运行时：adapter 注册、mock、schema 校验、inferSchema |
| [`@ai-request-guard/vite-plugin`](./packages/vite-plugin) | Vite 插件：真实请求拦截 + HTML 差异报告 + AI Adapter GUI |
| [`@ai-request-guard/webpack-plugin`](./packages/webpack-plugin) | Webpack 插件：真实请求拦截 + HTML 差异报告 + AI Adapter GUI |

## 快速上手

```bash
pnpm add @ai-request-guard/core
pnpm add -D @ai-request-guard/vite-plugin  # 可选，Vite 项目使用
```

```typescript
import AIRequestGuard from '@ai-request-guard/core'

// 1. 定义 adapter：后端 DTO → 前端 ViewModel
function getUserDetailAdapter(raw: unknown) {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    age: Number(r.age ?? 0),
  }
}

// 2. 注册 adapter（函数名自动作为 ID）
AIRequestGuard.register({
  adapter: getUserDetailAdapter,
  // viewSchema 可选：用于 dev 模式 schema diff 校验 + mock 数据
  viewSchema: () => ({ id: 0, userName: '', mobile: '', age: 0 }),
})

// 3. 发起请求，自动经过 adapter 转换
const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})

console.log(user.userName) // ViewModel 字段，不受后端字段名变化影响
```

## AI Adapter 生成

手写 adapter 有一定成本，尤其字段多、命名差异大时。配置 AI provider 后，插件在独立端口启动 GUI 管理页面，dev 启动时终端自动打印地址：

```
  ➜  AIRequestGuard GUI:  http://localhost:5174
```

在 GUI 中填写 Adapter ID、粘贴 Mock JSON 和 Raw JSON，点击「手动生成」即可得到初稿：

```typescript
// GUI 生成示例，复制后粘贴到项目中
function getUserDetailAdapter(raw: unknown) {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,
    mobile: r.phone_no as string,
    // avatar: ???  // 未找到对应字段，请手动补充
  }
}

AIRequestGuard.register({ adapter: getUserDetailAdapter })
```

支持 OpenAI 兼容格式（DeepSeek、通义千问等）和 Anthropic Claude。apiKey 仅存于 Node 层，不进入浏览器产物。

```typescript
// vite.config.ts
aiRequestGuardPlugin({
  ai: {
    provider: 'openai-compatible',
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
    model: 'deepseek-chat',
  },
})
```

详见 [AI Adapter 生成指南](https://guard.pennji.cn/guide/ai-adapter)。

## 本地开发

```bash
pnpm install
pnpm all:dev      # 同时启动 playground (5173) + 文档站 (5174)
pnpm build:all    # 构建所有包
pnpm test         # 运行单元测试
```

## License

MIT
