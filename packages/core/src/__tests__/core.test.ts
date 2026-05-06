import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateSchema, hasDiff } from '../schema'
import { registry } from '../registry'
import { resolveMock, setMockDev } from '../mock'
import { reportDiff, getDiffRecords, clearDiffRecords } from '../reporter'

// ══════════════════════════════════════════════════════════
// validateSchema
// ══════════════════════════════════════════════════════════

describe('validateSchema', () => {
  it('完全匹配 — 无差异', () => {
    const diff = validateSchema('api', { id: 1, name: 'foo' }, { id: 0, name: '' })
    expect(diff.missingFields).toEqual([])
    expect(diff.typeMismatches).toEqual([])
    expect(diff.extraFields).toEqual([])
  })

  it('缺失字段', () => {
    const diff = validateSchema('api', { id: 1 }, { id: 0, name: '' })
    expect(diff.missingFields).toContain('name')
  })

  it('多余字段', () => {
    const diff = validateSchema('api', { id: 1, name: 'foo', extra: true }, { id: 0, name: '' })
    expect(diff.extraFields).toContain('extra')
  })

  it('类型不匹配', () => {
    const diff = validateSchema('api', { age: '28' }, { age: 0 })
    expect(diff.typeMismatches).toEqual([{ field: 'age', expected: 'number', actual: 'string' }])
  })

  it('null 值跳过类型检查', () => {
    const diff = validateSchema('api', { val: null }, { val: 0 })
    expect(diff.typeMismatches).toEqual([])
  })

  it('data 为 null — 返回空 diff', () => {
    const diff = validateSchema('api', null, { id: 0 })
    expect(diff.missingFields).toEqual([])
  })

  it('data 为数组 — 取第一个元素校验', () => {
    const diff = validateSchema('api', [{ id: 1, name: 'foo' }], { id: 0, name: '' })
    expect(diff.missingFields).toEqual([])
    expect(diff.typeMismatches).toEqual([])
  })

  it('data 为空数组 — 返回空 diff', () => {
    const diff = validateSchema('api', [], { id: 0 })
    expect(diff.missingFields).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════
// hasDiff
// ══════════════════════════════════════════════════════════

describe('hasDiff', () => {
  it('无差异返回 false', () => {
    expect(hasDiff({ id: 'x', missingFields: [], extraFields: [], typeMismatches: [] })).toBe(false)
  })

  it('有缺失字段返回 true', () => {
    expect(hasDiff({ id: 'x', missingFields: ['name'], extraFields: [], typeMismatches: [] })).toBe(true)
  })

  it('有类型不匹配返回 true', () => {
    expect(hasDiff({ id: 'x', missingFields: [], extraFields: [], typeMismatches: [{ field: 'age', expected: 'number', actual: 'string' }] })).toBe(true)
  })

  it('仅有多余字段返回 false（不计入差异）', () => {
    expect(hasDiff({ id: 'x', missingFields: [], extraFields: ['extra'], typeMismatches: [] })).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// registry
// ══════════════════════════════════════════════════════════

describe('registry', () => {
  beforeEach(() => registry.clear())

  it('注册并获取 adapter', () => {
    const fn = (r: unknown) => r
    registry.register('api-a', fn)
    expect(registry.get('api-a')).toBe(fn)
  })

  it('未注册返回 undefined', () => {
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('has 正确判断存在性', () => {
    registry.register('api-b', (r) => r)
    expect(registry.has('api-b')).toBe(true)
    expect(registry.has('api-c')).toBe(false)
  })

  it('重复注册覆盖旧值', () => {
    const fn1 = () => 1
    const fn2 = () => 2
    registry.register('api-d', fn1)
    registry.register('api-d', fn2)
    expect(registry.get('api-d')).toBe(fn2)
  })

  it('clear 清空所有注册', () => {
    registry.register('api-e', (r) => r)
    registry.clear()
    expect(registry.has('api-e')).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════
// resolveMock
// ══════════════════════════════════════════════════════════

describe('resolveMock', () => {
  it('静态值直接返回', () => {
    expect(resolveMock('id', { foo: 1 })).toEqual({ foo: 1 })
  })

  it('工厂函数接收 id 并调用', () => {
    const fn = vi.fn((id: string) => ({ id }))
    const result = resolveMock('my-id', fn)
    expect(fn).toHaveBeenCalledWith('my-id')
    expect(result).toEqual({ id: 'my-id' })
  })

  it('无 mockData 返回 null', () => {
    expect(resolveMock('id', undefined)).toBeNull()
  })

  it('无 mockData 且 dev=true 时发出警告', () => {
    setMockDev(true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resolveMock('missing-id', undefined)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing-id'))
    warn.mockRestore()
    setMockDev(false)
  })
})

// ══════════════════════════════════════════════════════════
// reporter
// ══════════════════════════════════════════════════════════

describe('reporter', () => {
  beforeEach(() => clearDiffRecords())

  it('reportDiff 收集记录', () => {
    reportDiff({ id: 'api-1', missingFields: ['name'], extraFields: [], typeMismatches: [] })
    expect(getDiffRecords()).toHaveLength(1)
  })

  it('同一 id 重复上报时覆盖而非追加', () => {
    reportDiff({ id: 'api-1', missingFields: ['a'], extraFields: [], typeMismatches: [] })
    reportDiff({ id: 'api-1', missingFields: ['b'], extraFields: [], typeMismatches: [] })
    const records = getDiffRecords()
    expect(records).toHaveLength(1)
    expect(records[0].missingFields).toEqual(['b'])
  })

  it('getDiffRecords 返回副本，不影响内部状态', () => {
    reportDiff({ id: 'api-2', missingFields: [], extraFields: [], typeMismatches: [] })
    const copy = getDiffRecords()
    copy.push({ id: 'injected', missingFields: [], extraFields: [], typeMismatches: [] })
    expect(getDiffRecords()).toHaveLength(1)
  })

  it('clearDiffRecords 清空', () => {
    reportDiff({ id: 'api-3', missingFields: [], extraFields: [], typeMismatches: [] })
    clearDiffRecords()
    expect(getDiffRecords()).toHaveLength(0)
  })
})
