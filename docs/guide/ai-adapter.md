# AI Adapter 生成

手写 adapter 需要逐字段对照 mock 和后端原始数据，字段多时工作量较大。**Adapter Generator GUI** 配置 AI provider 后可自动生成带置信度标注的 adapter 初稿。

## 支持的 AI Provider

| Provider | 说明 |
|----------|------|
| `openai-compatible` | 兼容 OpenAI 格式的模型，如 DeepSeek、通义千问等 |
| `anthropic` | Anthropic Claude 系列模型 |

## 配置

### Vite 项目

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
      fileType: 'ts', // 生成文件扩展名，默认 'ts'
    }),
  ],
})
```

使用 Anthropic Claude：

```ts
aiRequestGuardPlugin({
  ai: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_KEY,
    model: 'claude-sonnet-4-6', // 可选，有默认值
  },
})
```

### webpack / Vue CLI 4 项目

```js
// vue.config.js
const { AIGuardWebpackPlugin } = require('@ai-request-guard/webpack-plugin')

const aiGuardPlugin = new AIGuardWebpackPlugin({
  ai: {
    provider: 'openai-compatible',
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
    model: 'deepseek-chat',
  },
  fileType: 'ts',
})

module.exports = {
  configureWebpack: { plugins: [aiGuardPlugin] },
  devServer: {
    before(app) { aiGuardPlugin.applyMiddlewares(app) },
  },
}
```

::: warning apiKey 安全
`apiKey` 只存在于 Vite/Webpack 插件的 **Node 层（devServer）**，不会进入浏览器产物。生产构建时 AI 能力完全隔离，GUI 完全不存在。
:::

## 使用流程

配置完成后启动 dev 服务，终端会打印 GUI 地址：

```
  ➜  AIRequestGuard GUI:  http://localhost:5174
```

> 端口默认为 devServer 端口 + 1，被占用时自动 +1 探测。可通过 `guiPort` 手动指定端口。

在浏览器打开该地址，按以下步骤操作：

1. 填写 **Adapter ID**（对应最终的 `register` id，如 `user-detail`）
2. 粘贴 **Mock JSON**（前端期望的数据结构，即 ViewModel 格式）
3. 粘贴 **Raw JSON**（后端真实返回数据）
4. 点击「生成 Adapter」，等待 AI 返回带置信度标注的 adapter 草稿
5. 点击「复制代码」粘贴到项目文件，或点击「写入文件」直接写入

## 置信度标注

AI 对每个字段评估置信度并添加注释：

| 标注 | 含义 | 建议操作 |
|------|------|---------|
| `// ✅` | 字段名精确匹配或驼峰-下划线转换，类型一致 | 可直接使用 |
| `// ❓` | 语义相似但名称不同，需人工确认 | 核对后使用 |
| `// ❌` | 未找到对应字段，已留空 | 手动填写 |

示例输出：

```ts
AIRequestGuard.register('user-detail', (raw) => {
  const r = raw as Record<string, unknown>
  return {
    id: r.user_id as number,           // ✅
    mobile: r.phone_no as string,      // ❓ 请确认：phone_no 是否对应 mobile
    // avatar: ???                     // ❌ 未找到对应字段，请手动填写
  }
})
```

## inferSchema 工具函数

GUI 内部使用 `inferSchema` 从 mock 数据推导 schema，你也可以在代码中直接使用：

```ts
import { inferSchema } from '@ai-request-guard/core'

const mock = { userName: '张三', mobile: '13800138000', age: 28 }

const user = await AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/api/user').then(r => r.json()),
  mockData: mock,
  schema: inferSchema(mock), // 替代手写 schema
})
```

### mockjs 兼容

`inferSchema` 只接收纯 JSON 对象，不解析 mockjs 模板语法。使用 mockjs 时，先执行 `Mock.mock(template)` 再传入结果：

```ts
import Mock from 'mockjs'
import { inferSchema } from '@ai-request-guard/core'

const mock = Mock.mock({ 'id|1-100': 1, userName: '@cname' })
// 传执行结果，不传模板
schema: inferSchema(mock)
```

## 未配置 AI 时的降级

未配置 `ai` 选项时，GUI 页面仍可访问，但生成按钮禁用，提示"未配置 AI provider"。reporting 功能不受影响。
