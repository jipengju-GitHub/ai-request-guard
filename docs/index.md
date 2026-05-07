---
layout: home

hero:
  name: AIRequestGuard
  text: 前端防腐层 SDK
  tagline: 用 Adapter 模式隔离后端数据结构变化，让接口重构不再影响前端视图逻辑
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/core

features:
  - icon: 🔄
    title: Adapter 模式
    details: 将后端 DTO 与前端 ViewModel 彻底解耦。后端字段改名、结构调整，只需更新 adapter，视图代码零修改。

  - icon: 🧪
    title: Mock 系统
    details: 支持静态数据和工厂函数两种 mock 形式，开发阶段无需等待后端接口，生产构建自动 tree-shake。

  - icon: 🔍
    title: Schema 校验
    details: 开发模式下自动对比 adapter 输出与预期 schema，缺失字段、类型不匹配实时告警，问题早发现早修复。

  - icon: 📊
    title: 差异报告
    details: 配合 Vite / Webpack 插件，真实请求触发后自动生成 HTML 差异报告，直观展示哪些接口字段与约定不符。
---
