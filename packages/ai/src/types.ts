export interface AIProvider {
  complete(prompt: string): Promise<string>
}

export interface OpenAICompatibleOptions {
  baseURL: string
  apiKey: string
  model: string
  /** @default 2000 */
  maxTokens?: number
}

export interface AnthropicOptions {
  apiKey: string
  /** @default 'claude-haiku-4-5-20251001' */
  model?: string
  /** @default 2000 */
  maxTokens?: number
}

export interface GenerateOptions {
  provider: AIProvider
  adapterId: string
  /** inferred schema (from inferSchema) */
  schema: Record<string, unknown>
  /** raw response from backend */
  raw: Record<string, unknown>
}

export interface GenerateResult {
  /** generated adapter source code */
  code: string
  /** validation warnings if any fields were missing from output */
  warnings: string[]
}
