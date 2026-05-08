import type { AIProvider, OpenAICompatibleOptions, AnthropicOptions } from './types'

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
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`AI provider error ${res.status}: ${text}`)
      }
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Anthropic API error ${res.status}: ${text}`)
      }
      const json = (await res.json()) as { content: Array<{ text: string }> }
      const text = json?.content?.[0]?.text
      if (typeof text !== 'string') throw new Error('Unexpected response shape from Anthropic provider')
      return text
    },
  }
}
