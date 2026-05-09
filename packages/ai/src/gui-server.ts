import * as http from 'http'
import * as net from 'net'
import { resolve } from 'path'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { inferSchema } from '@ai-request-guard/core'
import { generateAdapter } from './generate'
import { buildGuiHtml } from './gui'
import type { AIProvider } from './types'

export interface GuiServerOptions {
  /** devServer 端口，GUI 默认从 devServerPort + 1 开始探测 */
  devServerPort: number
  /** 手动指定 GUI 端口，跳过自动探测 */
  guiPort?: number
  aiConfigured: boolean
  adaptersDir: string
  fileType: 'ts' | 'js'
  rootDir: string
  buildProvider: () => AIProvider | null
  onLog: (msg: string) => void
}

/** 探测从 startPort 开始第一个可用端口（最多尝试 10 个） */
function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort
    const tryNext = () => {
      if (port > startPort + 10) { reject(new Error('no free port found')); return }
      const s = net.createServer()
      s.once('error', () => { port++; tryNext() })
      s.once('listening', () => { s.close(() => resolve(port)) })
      s.listen(port)
    }
    tryNext()
  })
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((res) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => res(body))
  })
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

export function createGuiServer(opts: GuiServerOptions): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = req.url ?? '/'
    const method = req.method ?? 'GET'

    // GET / → GUI 页面
    if (method === 'GET' && (url === '/' || url === '')) {
      const html = buildGuiHtml({ aiConfigured: opts.aiConfigured, adaptersDir: opts.adaptersDir, fileType: opts.fileType })
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    // POST /infer-schema → 本地推导 schema，无需 AI
    if (method === 'POST' && url === '/infer-schema') {
      const body = await readBody(req)
      try {
        const { mock } = JSON.parse(body) as { mock: Record<string, unknown> }
        const schema = inferSchema(mock)
        json(res, 200, { schema })
      } catch (err) {
        json(res, 500, { error: String(err) })
      }
      return
    }

    // POST /generate → 调 AI 生成 adapter
    if (method === 'POST' && url === '/generate') {
      const body = await readBody(req)
      const provider = opts.buildProvider()
      if (!provider) {
        json(res, 400, { error: '未配置 AI provider，请在插件配置中添加 ai.apiKey' })
        return
      }
      try {
        const { id, mock, raw } = JSON.parse(body) as { id: string; mock: Record<string, unknown>; raw: Record<string, unknown> }
        const schema = inferSchema(mock)
        const result = await generateAdapter({ provider, adapterId: id, schema, raw })
        json(res, 200, result)
      } catch (err) {
        json(res, 500, { error: String(err) })
      }
      return
    }

    // POST /write-file → 写 adapter 文件
    if (method === 'POST' && url === '/write-file') {
      const body = await readBody(req)
      try {
        const { id, code } = JSON.parse(body) as { id: string; code: string }
        const fileName = id.replace(/[^a-zA-Z0-9-_]/g, '-') + '.' + opts.fileType
        const dir = resolve(opts.rootDir, opts.adaptersDir)
        const filePath = resolve(dir, fileName)
        if (existsSync(filePath)) {
          json(res, 409, { error: `文件已存在: ${filePath}，请手动处理` })
          return
        }
        mkdirSync(dir, { recursive: true })
        writeFileSync(filePath, code, 'utf-8')
        const relPath = opts.adaptersDir.replace(/\\/g, '/') + '/' + fileName
        opts.onLog(`[ai-request-guard] adapter written → ${relPath}`)
        json(res, 200, { path: relPath })
      } catch (err) {
        json(res, 500, { error: String(err) })
      }
      return
    }

    res.writeHead(404).end()
  })

  return server
}

export async function startGuiServer(opts: GuiServerOptions): Promise<{ server: http.Server; port: number }> {
  const startPort = opts.guiPort ?? opts.devServerPort + 1
  const port = await findFreePort(startPort)
  const server = createGuiServer(opts)
  await new Promise<void>((resolve) => server.listen(port, resolve))
  return { server, port }
}
