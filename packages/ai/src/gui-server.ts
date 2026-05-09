import * as http from 'http'
import * as net from 'net'
import { generateAdapter } from './generate'
import { buildGuiHtml } from './gui'
import type { AIProvider } from './types'

function inferValue(val: unknown): unknown {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) {
    const first = val.find((item) => item !== null && item !== undefined)
    if (first !== undefined && typeof first === 'object') return [inferValue(first)]
    return []
  }
  if (typeof val === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(val as Record<string, unknown>))
      result[key] = inferValue((val as Record<string, unknown>)[key])
    return result
  }
  if (typeof val === 'string') return ''
  if (typeof val === 'number') return 0
  if (typeof val === 'boolean') return false
  return null
}
function inferSchema(mock: Record<string, unknown>): Record<string, unknown> {
  return inferValue(mock) as Record<string, unknown>
}

export interface GuiServerOptions {
  devServerPort: number
  guiPort?: number
  aiConfigured: boolean
  /** @deprecated 写入文件功能已移除，无需配置 */
  adaptersDir?: string
  fileType?: 'ts' | 'js'
  rootDir?: string
  buildProvider: () => AIProvider | null
  onLog: (msg: string) => void
}

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

    if (method === 'GET' && (url === '/' || url === '')) {
      const html = buildGuiHtml({ aiConfigured: opts.aiConfigured, fileType: opts.fileType })
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

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
