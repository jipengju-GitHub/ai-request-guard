# Changelog

## 1.0.0

> 引入 AI 能力。

### 新增

**`@ai-request-guard/core`**

- 新增 `inferSchema(mockData)` 工具函数：从 mock 对象推导 schema，替代手写 schema

**`@ai-request-guard/vite-plugin` / `@ai-request-guard/webpack-plugin`**

- 新增 `ai` 配置项：接入 AI provider，启用 Adapter Generator GUI
- 新增 `fileType` 配置项：生成文件扩展名，`'ts'`（默认）或 `'js'`
- 新增 `/__ai-guard` GUI 管理页面：dev 启动后自动在终端打印访问地址
  - 填写 Adapter ID + Mock JSON + Raw JSON，一键生成 adapter 初稿
  - 带置信度标注（✅ 高 / ❓ 中 / ❌ 低）
  - 支持复制到剪贴板或直接写入文件

### 技术说明

- AI provider 自实现，不依赖 Vercel AI SDK；AI 功能需要 Node 18+（原生 fetch），基础 reporting 功能兼容 Node 16
- 内置 `openai-compatible` preset（支持 DeepSeek / 通义千问等兼容 OpenAI 格式的模型）
- 内置 `anthropic` preset（支持 Claude 系列模型）
- AI 调用后通过 `vm.runInNewContext` 对生成代码进行运行时校验
- apiKey 只存在于 Node 层（devServer），不进入浏览器产物
- 生产构建时 AI 能力完全隔离（Vite 插件 `apply: 'serve'`，Webpack 插件 `mode` 判断）

---

## 0.1.9

- 文档修复

## 0.1.8

- webpack 插件上报规则调整

## 0.1.7

- schema 增加强约束
