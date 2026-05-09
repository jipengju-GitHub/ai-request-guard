import type { AIProvider, OpenAICompatibleOptions, AnthropicOptions } from './types'

async function fetchPost(url: string, headers: Record<string, string>, body: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return text
}

/** OpenAI-compatible provider (DeepSeek, Qwen, most domestic models) */
export function openaiCompatible(opts: OpenAICompatibleOptions): AIProvider {
  const { baseURL, apiKey, model, maxTokens = 2000 } = opts
  return {
    async complete(prompt: string): Promise<string> {
      const url = `${baseURL.replace(/\/$/, '')}/v1/chat/completions`
      const body = JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      const data = await fetchPost(url, { Authorization: `Bearer ${apiKey}` }, body)
      const json = JSON.parse(data) as { choices: Array<{ message: { content: string } }> }
      const content = json?.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new Error('Unexpected response shape from OpenAI-compatible provider')
      return content
    },
  }
}

/** Anthropic Claude native format */
export function anthropic(opts: AnthropicOptions): AIProvider {
  const { apiKey, model = 'claude-haiku-4-5-20251001', maxTokens = 2000 } = opts
  return {
    async complete(prompt: string): Promise<string> {
      const body = JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })
      const data = await fetchPost(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body
      )
      const json = JSON.parse(data) as { content: Array<{ text: string }> }
      const text = json?.content?.[0]?.text
      if (typeof text !== 'string') throw new Error('Unexpected response shape from Anthropic provider')
      return text
    },
  }
}
