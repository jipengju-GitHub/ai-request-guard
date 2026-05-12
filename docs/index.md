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
  - icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="g1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g1)" opacity="0.12"/><path d="M24 8L12 14v8c0 9 5.4 17.4 12 20 6.6-2.6 12-11 12-20v-8L24 8z" fill="url(#g1)" opacity="0.85"/><path d="M20 22l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    title: 防腐层隔离
    details: 在请求边界建立稳固的防腐层，将后端 DTO 与前端 ViewModel 彻底解耦。后端字段改名、结构重组，只需更新对应 adapter，业务组件代码保持稳定。天然适配 BFF、微前端、直连后端等各类架构。

  - icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="g2" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g2)" opacity="0.12"/><rect x="10" y="14" width="28" height="20" rx="4" fill="url(#g2)" opacity="0.85"/><circle cx="17" cy="24" r="2" fill="white"/><circle cx="24" cy="24" r="2" fill="white"/><circle cx="31" cy="24" r="2" fill="white"/></svg>
    title: 不限框架与构建工具
    details: 框架无关，Vue、React、Svelte 等均可接入，核心库无任何框架依赖。原生支持 Vite 与 Webpack 4/5，构建插件在 dev 模式挂载 GUI 与差异报告，生产构建自动 tree-shake，零运行时开销。

  - icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="g3" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#f59e0b"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g3)" opacity="0.12"/><path d="M24 10c-3.3 0-6 2.7-6 6 0 3 3 4.5 3 7.5h6c0-3 3-4.5 3-7.5 0-3.3-2.7-6-6-6z" fill="url(#g3)" opacity="0.85"/><rect x="20" y="26" width="8" height="2" rx="1" fill="url(#g3)"/><rect x="20" y="30" width="8" height="2" rx="1" fill="url(#g3)"/><path d="M21 34h6" stroke="url(#g3)" stroke-width="2" stroke-linecap="round"/><path d="M27 13l2-2M21 13l-2-2M24 10V7" stroke="url(#g3)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/></svg>
    title: AI 辅助 Adapter 生成
    details: 在 GUI 管理界面粘贴 Mock ViewModel 和后端原始 JSON，AI 自动推导字段映射关系，输出带置信度标注的 adapter 初稿，大幅降低接入成本，尤其适合字段多、命名差异大的复杂接口。

  - icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="g4" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#06b6d4"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g4)" opacity="0.12"/><rect x="10" y="12" width="28" height="6" rx="3" fill="url(#g4)" opacity="0.85"/><rect x="10" y="21" width="28" height="6" rx="3" fill="url(#g4)" opacity="0.6"/><rect x="10" y="30" width="28" height="6" rx="3" fill="url(#g4)" opacity="0.4"/><circle cx="14" cy="15" r="1.5" fill="white"/><circle cx="14" cy="24" r="1.5" fill="white"/><circle cx="14" cy="33" r="1.5" fill="white"/><path d="M32 14h3M32 23h3M32 32h3" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/></svg>
    title: 运行时 Schema 校验
    details: 开发模式下自动对比 adapter 输出与预期 ViewModel schema，缺失字段、类型不匹配实时告警；真实请求触发后生成可视化 HTML 差异报告，精准定位接口漂移。
---
