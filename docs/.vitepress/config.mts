import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'
const playgroundUrl = isProd ? 'https://guard.pennji.cn/playground/' : 'http://localhost:5173'

export default defineConfig({
  base: '/',
  sitemap: {
    hostname: 'https://guard.pennji.cn',
  },
  vite: {
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
    },
  },
  title: 'AIRequestGuard',
  description: '前端防腐层 SDK — 用 Adapter 模式隔离后端数据结构变化',
  lang: 'zh-CN',
  head: [['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }]],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API 参考', link: '/api/core' },
      { text: '设计理念', link: '/design' },
      { text: 'Changelog', link: '/changelog' },
      { text: 'Playground', link: playgroundUrl, target: '_blank' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速上手',
          items: [
            { text: '安装与配置', link: '/guide/getting-started' },
            { text: '编写 Adapter', link: '/guide/adapter' },
            { text: 'AI Adapter 生成', link: '/guide/ai-adapter' },
            { text: 'Mock 系统', link: '/guide/mock' },
            { text: 'Schema 校验', link: '/guide/schema' },
            { text: '真实请求拦截', link: '/guide/interceptor' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '@ai-request-guard/core', link: '/api/core' },
            { text: '@ai-request-guard/vite-plugin', link: '/api/vite-plugin' },
            { text: '@ai-request-guard/webpack-plugin', link: '/api/webpack-plugin' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jipengju-GitHub/ai-request-guard' },
    ],

    footer: {
      message: 'Released under the MIT License.',
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  },
})
