import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAdapter } from '../generate'
import type { AIProvider } from '../types'

// ══════════════════════════════════════════════════════════
// extractCode (via generateAdapter with mock provider)
// ══════════════════════════════════════════════════════════

function makeMockProvider(response: string): AIProvider {
  return { complete: vi.fn().mockResolvedValue(response) }
}

const schema = { userName: '', mobile: '', age: 0 }
const raw = { username: '张三', phone_no: '13800138000', age: 28 }

describe('generateAdapter', () => {
  it('直接返回代码块时解析成功', async () => {
    const code = `(raw) => ({ userName: raw.username, mobile: raw.phone_no, age: raw.age })`
    const provider = makeMockProvider(code)
    const result = await generateAdapter({ provider, adapterId: 'getUserDetailAdapter', schema, raw })
    expect(result.code).toContain('export const getUserDetailAdapter =')
    expect(result.code).toContain('AIRequestGuard.register({')
    expect(result.code).toContain('adapter: getUserDetailAdapter')
    expect(result.warnings).toHaveLength(0)
  })

  it('markdown 代码块格式能正常提取', async () => {
    const code = `(raw) => ({ userName: raw.username, mobile: raw.phone_no, age: raw.age })`
    const provider = makeMockProvider(`\`\`\`typescript\n${code}\n\`\`\``)
    const result = await generateAdapter({ provider, adapterId: 'getUserDetailAdapter', schema, raw })
    expect(result.code).toContain('AIRequestGuard.register({')
    expect(result.warnings).toHaveLength(0)
  })

  it('adapter 输出缺少 schema 字段时给出 warning', async () => {
    // Returns object missing 'mobile' field
    const code = `(raw) => ({ userName: raw.username, age: raw.age })`
    const provider = makeMockProvider(code)
    const result = await generateAdapter({ provider, adapterId: 'getUserDetailAdapter', schema, raw })
    expect(result.warnings.some(w => w.includes('mobile'))).toBe(true)
  })

  it('adapter 代码运行时报错时 throw', async () => {
    const code = `(raw) => { throw new Error('boom') }`
    const provider = makeMockProvider(code)
    await expect(
      generateAdapter({ provider, adapterId: 'getUserDetailAdapter', schema, raw })
    ).rejects.toThrow('validation')
  })

  it('adapter 未返回对象时 throw', async () => {
    const code = `(raw) => 'not-an-object'`
    const provider = makeMockProvider(code)
    await expect(
      generateAdapter({ provider, adapterId: 'getUserDetailAdapter', schema, raw })
    ).rejects.toThrow('validation')
  })
})

// ══════════════════════════════════════════════════════════
// provider shape (unit — no real HTTP)
// ══════════════════════════════════════════════════════════

import type { IncomingMessage, ClientRequest } from 'http'
import { EventEmitter } from 'events'

function mockHttpModule(statusCode: number, responseBody: string) {
  return {
    request(_url: URL, _opts: unknown, cb: (res: IncomingMessage) => void): ClientRequest {
      const res = new EventEmitter() as IncomingMessage
      ;(res as any).statusCode = statusCode
      process.nextTick(() => {
        cb(res)
        res.emit('data', Buffer.from(responseBody))
        res.emit('end')
      })
      const req = new EventEmitter() as ClientRequest
      req.end = vi.fn()
      return req
    },
  }
}

vi.mock('https', () => ({ default: mockHttpModule(200, '{}') }))

beforeEach(() => {
  vi.resetModules()
})

describe('openaiCompatible', () => {
  it('解析 choices[0].message.content', async () => {
    const body = JSON.stringify({ choices: [{ message: { content: 'hello' } }] })
    vi.doMock('https', () => ({ default: mockHttpModule(200, body) }))

    const { openaiCompatible } = await import('../provider')
    const provider = openaiCompatible({ baseURL: 'https://api.example.com', apiKey: 'key', model: 'gpt-4' })
    const result = await provider.complete('test prompt')
    expect(result).toBe('hello')
  })

  it('非 2xx 时 throw', async () => {
    vi.doMock('https', () => ({ default: mockHttpModule(401, 'Unauthorized') }))

    const { openaiCompatible } = await import('../provider')
    const provider = openaiCompatible({ baseURL: 'https://api.example.com', apiKey: 'bad', model: 'gpt-4' })
    await expect(provider.complete('x')).rejects.toThrow('401')
  })
})

describe('anthropic', () => {
  it('解析 content[0].text', async () => {
    const body = JSON.stringify({ content: [{ text: 'world' }] })
    vi.doMock('https', () => ({ default: mockHttpModule(200, body) }))

    const { anthropic } = await import('../provider')
    const provider = anthropic({ apiKey: 'key' })
    const result = await provider.complete('test prompt')
    expect(result).toBe('world')
  })
})
