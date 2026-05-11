---
layout: home

hero:
  name: AIRequestGuard
  text: 前端请求防腐层
  tagline: 静态即终版，联调无重构。
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/getting-started
    - theme: alt
      text: API 参考
      link: /api/core

features:
  - icon: 🏗️
    title: 防腐层隔离
    details: 在请求边界建立稳固的防腐层，将后端 DTO 与前端 ViewModel 彻底解耦。后端字段改名、结构重组，只需更新对应 adapter，业务组件代码保持稳定。天然适配 BFF、微前端、直连后端等各类架构。

  - icon: 🔌
    title: 不限框架与构建工具
    details: 框架无关，Vue、React、Svelte 等均可接入，核心库无任何框架依赖。原生支持 Vite 与 Webpack 4/5，构建插件在 dev 模式挂载 GUI 与差异报告，生产构建自动 tree-shake，零运行时开销。

  - icon: 🤖
    title: AI 辅助 Adapter 生成
    details: 在 GUI 管理界面粘贴 Mock ViewModel 和后端原始 JSON，AI 自动推导字段映射关系，输出带置信度标注的 adapter 初稿，大幅降低接入成本，尤其适合字段多、命名差异大的复杂接口。

  - icon: 📊
    title: 运行时 Schema 校验
    details: 开发模式下自动对比 adapter 输出与预期 ViewModel schema，缺失字段、类型不匹配实时告警；真实请求触发后生成可视化 HTML 差异报告，精准定位接口漂移。
---
