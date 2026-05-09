import type { AdapterFn } from '@ai-request-guard/core'

export interface Scenario {
  id: string
  label: string
  desc: string
  adapter: AdapterFn
  raw: unknown
  defaultMode: 'real' | 'mock'
  /** 仅用于 playground diff 展示，传给 validateSchema */
  displaySchema?: Record<string, unknown>
}

export type { AdapterFn }
