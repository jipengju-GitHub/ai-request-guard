# Changelog

## 0.1.0 (2026-04-29)

### Features

- **Adapter 模式**：通过 `AIRequestGuard.register(id, fn)` 注册 adapter，将后端 DTO 映射为前端 ViewModel，彻底隔离视图层与接口字段
- **主函数**：`AIRequestGuard({ id, request, schema?, mode?, mockData? })` 统一入口，支持 real / mock 两种模式
- **Mock 系统**：支持静态数据和工厂函数两种形式，开发阶段无需等待后端；生产构建自动 tree-shake
- **Schema 校验**：dev 模式下自动对比 adapter 输出与预期 ViewModel 结构，缺失字段、类型不匹配实时 Console 告警
- **真实请求拦截**：通过 `AIRequestGuard.watch(pattern, id)` 注册 URL 监听规则，配合 vite-plugin 自动采集真实接口的 raw 数据
- **Diff 记录收集**：`reportDiff` / `getDiffRecords` / `clearDiffRecords` 供 Vite 插件批量上报使用
- **生产安全**：所有 dev 分支代码通过 `__DEV__` 标志在生产构建中 tree-shake，零额外运行时开销

### Exports

- 默认导出：`AIRequestGuard`（主函数 + 静态方法）
- 具名导出：`validateSchema`、`hasDiff`、`reportDiff`、`getDiffRecords`、`clearDiffRecords`、`generateReport`
- 类型导出：`GuardOptions`、`GuardConfig`、`GuardMode`、`Schema`、`AdapterFn`、`SchemaDiff`
