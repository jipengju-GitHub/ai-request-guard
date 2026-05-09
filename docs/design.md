# 设计理念

## 为什么需要防腐层？

前端应用与后端 API 之间存在一个长期被忽视的耦合问题：**视图代码直接消费后端字段**。

```typescript
// 常见写法 — 视图直接依赖后端字段名
const userName = response.data.user_name  // 后端哪天改成 username？
const deptName = response.data.dept.dept_name  // 嵌套结构变化？
```

后端字段一旦重命名、结构调整或类型变化，前端往往要全局搜索替换，改动散落在各个组件和页面中，漏改一处就是线上 bug。

这种问题的根本原因是**后端 DTO 泄漏到了视图层**，没有任何隔离。

## Adapter 模式

AIRequestGuard 借鉴领域驱动设计（DDD）中的**防腐层（Anti-Corruption Layer）**概念，在 HTTP 响应与视图代码之间建立一道隔离层：

```
后端 DTO  →  [Adapter]  →  前端 ViewModel  →  视图组件
```

Adapter 是一个纯函数，职责明确：

- 将 `snake_case` 映射为 `camelCase`
- 嵌套结构拍平
- 类型转换（字符串数字、枚举 code → 文本）
- 默认值补齐

后端接口变化时，**只需修改 adapter，视图代码零感知**。

## dev 模式与生产模式的分离

AIRequestGuard 在设计上严格区分两种运行环境：

**生产环境**：纯粹的 adapter 执行，零额外开销。mock 代码、schema 校验、diff 上报全部通过 `__DEV__` 标志在构建时 tree-shake，不进入生产产物。

**开发环境**：在 adapter 执行的基础上，叠加：
- Schema diff 校验（字段缺失 / 类型不匹配实时告警）
- fetch 拦截（自动捕获真实请求的 raw 数据）
- HTML 差异报告（可视化展示哪些接口与约定不符）

这种设计保证了**开发体验的提升不以生产性能为代价**。

## Schema 不是类型系统

AIRequestGuard 的 schema 校验不是 TypeScript 类型检查的替代品，两者解决的是不同层次的问题：

- **TypeScript 类型**：编译期，约束你写的代码，后端实际返回什么它无法感知
- **Schema 校验**：运行时，对比 adapter 输出与期望结构，发现真实的字段差异

只有在 dev 环境用真实接口跑过一遍，schema 校验才能暴露后端与约定的偏差。这是静态分析做不到的。

## Mock 与 Adapter 的关系

Mock 数据同样经过 adapter 转换，而非绕过它。这个设计保证了：

1. Mock 数据与真实数据保持相同的后端格式，格式差异早发现
2. Adapter 逻辑始终被执行，不会出现"mock 下好好的，真实接口就坏了"的情况

## 只拦截查询接口

fetch 拦截功能默认只捕获 GET 请求，这是有意为之的设计：

- **查询接口（GET）**：响应数据会映射到 ViewModel，需要 adapter 保持对齐
- **增删改接口（POST/PUT/DELETE）**：响应通常是操作结果（`{ success: true, id: 1 }`），不需要 ViewModel 映射，拦截它们只会引入噪音

如果你的项目用 POST 做查询，可以通过 `methods` 配置项扩展拦截范围，但建议保持克制。

