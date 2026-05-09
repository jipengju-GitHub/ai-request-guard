import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { aiRequestGuardPlugin } from '../packages/vite-plugin/src/index'

const mockApi: Record<string, unknown> = {
  '/api/user/detail': {
    user_id: 1,
    username: 'penn',
    phone_no: '138xxxxxxxx',
    dept: { dept_id: 10, dept_name: '研发部' },
    create_time: '2024-01-01 10:00:00',
    age: '28',
  },
  '/api/order/list': {
    total: 2,
    list: [
      { order_id: 'A001', order_amount: 99.9, status_code: 1 },
      { order_id: 'A002', order_amount: 199.0, status_code: 2 },
    ],
  },
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/playground/' : '/',
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@ai-request-guard/core': resolve(__dirname, '../packages/core/src/index.ts'),
    },
  },
  define: {
    __DEV__: mode !== 'production',
  },
  plugins: [
    vue(),
    aiRequestGuardPlugin({
      ai: {
        provider: 'openai-compatible',
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_KEY ?? 'sk-e9738d4db9cb46fe80b03c201f55694b',
        model: 'deepseek-chat',
      },
    }),
    {
      name: 'playground-mock-api',
      configureServer(server) {
        server.middlewares.use('/api', (req, res) => {
          const url = req.url ?? '/'
          const data = mockApi['/api' + url]
          if (!data) {
            res.writeHead(404).end()
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        })
      },
    },
  ],
}))
