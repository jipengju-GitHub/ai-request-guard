# Changelog

## 1.0.2

> 问题修复、文档优化。

---

## 1.0.1

> API 重构：以函数引用替代字符串 ID，防腐层单一职责，支持 IDE 跳转。

### Breaking Changes

**`@ai-request-guard/core`**

- `AIRequestGuard.register(id, fn)` → `AIRequestGuard.register({ adapter, viewSchema? })`
  - id 由内部自动取 `adapter.name`（函数名），用户不再感知
  - `viewSchema` 替代原 `mockData`，在注册时传入，mock 模式和 diff 校验共用同一份数据
- `AIRequestGuard({ id, request, schema?, mockData? })` → `AIRequestGuard({ adapter, request, mode? })`
  - `id` 字段移除，改传 adapter 函数引用，支持 IDE Cmd/Ctrl+Click 跳转
  - `schema` 字段移除，由 `viewSchema` 内部自动推导
  - `mockData` 字段移除，迁移至 `register` 的 `viewSchema`
- `AIRequestGuard.watch(pattern, id)` → `AIRequestGuard.watch(pattern, adapter)`
  - 第二个参数由字符串 id 改为函数引用

### 内部实现

- 注册表由 `Map<string, Entry>` 改为 `WeakMap<AdapterFn, Entry>`，以函数引用为 key
- `provider.ts` 底层网络请求由 Node `http`/`https` 模块改为全局 `fetch`（Node 18+）

### 迁移指南

**旧写法：**

```ts
// 注册
AIRequestGuard.register('user-detail', (raw) => ({ ... }))

// 调用
AIRequestGuard({ id: 'user-detail', request, schema, mockData })

// watch
AIRequestGuard.watch('/api/user', 'user-detail')
```

**新写法：**

```ts
// 防腐层文件：定义函数 + 注册
export const getUserDetailAdapter = (raw) => ({ ... })

AIRequestGuard.register({
  viewSchema: () => ({ id: 0, userName: '' }),
  adapter: getUserDetailAdapter,
})

// 应用层：传函数引用
AIRequestGuard({ adapter: getUserDetailAdapter, request })

// watch
AIRequestGuard.watch('/api/user', getUserDetailAdapter)
```

---

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
