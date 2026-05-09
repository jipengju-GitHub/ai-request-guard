import { runInNewContext } from 'vm'
import type { AIProvider, GenerateOptions, GenerateResult } from './types'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt'

/**
 * Extract the adapter function source from AI response.
 * Handles markdown code blocks, bare code, and `const adapter = ...` assignment form.
 * Always returns a plain function expression (no assignment prefix).
 */
function extractCode(raw: string): string {
  // Strip markdown fences
  let code = raw.trim()
  const fenceMatch = code.match(/```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/)
  if (fenceMatch) code = fenceMatch[1].trim()

  // Strip leading `const adapter = ` (AI often outputs assignment form)
  code = code.replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '').trim()
  // Strip trailing semicolon
  if (code.endsWith(';')) code = code.slice(0, -1).trim()

  return code
}

/**
 * Validate AI-generated adapter code using vm.runInNewContext.
 * Executes the code with the provided raw data and checks:
 * 1. No syntax / runtime errors
 * 2. All schema keys are present in the output
 *
 * Returns warnings for any missing keys (does not throw).
 */
function validateCode(
  code: string,
  raw: Record<string, unknown>,
  schemaKeys: string[]
): { ok: boolean; error?: string; warnings: string[] } {
  let result: unknown
  try {
    const ctx: Record<string, unknown> = { result: undefined }
    runInNewContext(`result = (${code})(raw)`, Object.assign(ctx, { raw }))
    result = ctx.result
  } catch (err) {
    return { ok: false, error: String(err), warnings: [] }
  }

  if (typeof result !== 'object' || result === null) {
    return { ok: false, error: 'Adapter did not return an object', warnings: [] }
  }

  const outputKeys = Object.keys(result as Record<string, unknown>)
  const warnings: string[] = []
  for (const key of schemaKeys) {
    if (!outputKeys.includes(key)) {
      warnings.push(`Schema key "${key}" missing from adapter output`)
    }
  }

  return { ok: true, warnings }
}

/**
 * Generate an adapter function draft using AI.
 *
 * The prompt is sent as a combined system+user message.
 * For providers that do not support system messages natively (all our presets
 * use the messages array), we prepend the system prompt to the user message.
 */
export async function generateAdapter(opts: GenerateOptions): Promise<GenerateResult> {
  const { provider, adapterId, schema, raw } = opts
  const userContent = buildUserPrompt(adapterId, schema, raw)
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userContent}`

  const aiResponse = await provider.complete(fullPrompt)
  const code = extractCode(aiResponse)

  const schemaKeys = Object.keys(schema)
  const { ok, error, warnings } = validateCode(code, raw, schemaKeys)

  if (!ok) {
    throw new Error(`AI-generated adapter failed validation: ${error}`)
  }

  // Wrap into a register-ready snippet for display
  const snippet = buildSnippet(adapterId, code)
  const confidence = calcConfidence(code, schemaKeys, warnings)

  return { code: snippet, warnings, confidence }
}

function calcConfidence(code: string, schemaKeys: string[], warnings: string[]): number {
  const high = (code.match(/✅/g) ?? []).length
  const mid  = (code.match(/❓/g) ?? []).length
  const low  = (code.match(/❌/g) ?? []).length
  const total = high + mid + low
  if (total > 0) {
    return Math.round(((high * 1.0 + mid * 0.5 + low * 0.0) / total) * 100) / 100
  }
  // Fallback: warnings deduct from perfect score
  const deduction = schemaKeys.length > 0 ? warnings.length / schemaKeys.length : 0
  return Math.max(0, Math.round((1 - deduction) * 100) / 100)
}

function buildSnippet(adapterId: string, adapterBody: string): string {
  return [
    `export const ${adapterId} = ${adapterBody}`,
    ``,
    `AIRequestGuard.register({`,
    `  adapter: ${adapterId},`,
    `})`,
  ].join('\n')
}
