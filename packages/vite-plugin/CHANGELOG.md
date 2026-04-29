# Changelog

## 0.1.0 (2024-01-01)

### Features

- **Vite 插件**：`aiRequestGuardPlugin(options?)` 一行接入，支持 `outFile` 和 `methods` 配置项
- **虚拟模块**：`virtual:ai-request-guard/report-sink` 自动安装 `window.fetch` 拦截器，页面切换 / 关闭时批量上报 schema diff
- **`/__ai-guard/report` 端点**：接收浏览器端 schema diff 记录（`SchemaDiff[]`），去重聚合后写入报告
- **`/__ai-guard/raw` 端点**：接收 fetch 拦截器上报的原始响应数据通过 `findIdByUrl` 匹配 adapter id，记录 URL 和原始字段列表
- **HTML 差异报告**：自包含单文件（内联 CSS，无外部依赖），包含摘要徽章、接口列表表格、可折叠差异详情，双击浏览器直接打开
- **只拦截查询接口**：默认 `methods: ['GET']`，增删改接口不产生噪音；可通过配置项扩展

### Options

```typescript
interface AIGuardVitePluginOptions {
  outFile?: string   // default: 'ai-request-guard-report.html'
  methods?: string[] // default: ['GET']
}
```
