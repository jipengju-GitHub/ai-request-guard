import { describe, it, expect, vi } from 'vitest'
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

describe('openaiCompatible', () => {
  it('调用正确的 URL 并解析 choices[0].message.content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'hello' } }] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { openaiCompatible } = await import('../provider')
    const provider = openaiCompatible({ baseURL: 'https://api.example.com', apiKey: 'key', model: 'gpt-4' })
    const result = await provider.complete('test prompt')
    expect(result).toBe('hello')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    )
    vi.unstubAllGlobals()
  })

  it('非 2xx 时 throw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }))
    const { openaiCompatible } = await import('../provider')
    const provider = openaiCompatible({ baseURL: 'https://api.example.com', apiKey: 'bad', model: 'gpt-4' })
    await expect(provider.complete('x')).rejects.toThrow('401')
    vi.unstubAllGlobals()
  })
})

describe('anthropic', () => {
  it('调用 Anthropic API 并解析 content[0].text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ content: [{ text: 'world' }] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { anthropic } = await import('../provider')
    const provider = anthropic({ apiKey: 'key' })
    const result = await provider.complete('test prompt')
    expect(result).toBe('world')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    )
    vi.unstubAllGlobals()
  })
})
