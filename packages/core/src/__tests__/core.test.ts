import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateSchema, hasDiff, inferSchema } from '../schema'
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

  it('嵌套对象 — 递归校验', () => {
    const data = { data: { current: 1, size: 10, total: 100, records: [] } }
    const schema = { data: { current: 0, size: 0, total: 0, records: [{ id: '', name: '' }] } }
    const diff = validateSchema('api', data, schema)
    expect(diff.missingFields).toEqual([])
    expect(diff.typeMismatches).toEqual([])
  })

  it('嵌套对象 — 检测缺失字段', () => {
    const data = { data: { current: 1, size: 10 } }
    const schema = { data: { current: 0, size: 0, total: 0 } }
    const diff = validateSchema('api', data, schema)
    expect(diff.missingFields).toContain('data.total')
  })

  it('嵌套数组元素 — 检测缺失字段', () => {
    const data = { data: { records: [{ id: '1', name: 'test' }] } }
    const schema = { data: { records: [{ id: '', name: '', dept: '' }] } }
    const diff = validateSchema('api', data, schema)
    expect(diff.missingFields).toContain('data.records[].dept')
  })

  it('嵌套数组元素 — 检测多余字段', () => {
    const data = { data: { records: [{ id: '1', name: 'test', extra: true }] } }
    const schema = { data: { records: [{ id: '', name: '' }] } }
    const diff = validateSchema('api', data, schema)
    expect(diff.extraFields).toContain('data.records[].extra')
  })

  it('嵌套类型不匹配', () => {
    const data = { info: { age: '28' } }
    const schema = { info: { age: 0 } }
    const diff = validateSchema('api', data, schema)
    expect(diff.typeMismatches).toEqual([{ field: 'info.age', expected: 'number', actual: 'string' }])
  })

  it('data 中嵌套值非对象而 schema 期望对象', () => {
    const data = { data: 'not-an-object' }
    const schema = { data: { id: '' } }
    const diff = validateSchema('api', data, schema)
    expect(diff.typeMismatches).toEqual([{ field: 'data', expected: 'object', actual: 'string' }])
  })

  it('data 中值非数组而 schema 期望数组', () => {
    const data = { items: 'not-array' }
    const schema = { items: [{ id: '' }] }
    const diff = validateSchema('api', data, schema)
    expect(diff.typeMismatches).toEqual([{ field: 'items', expected: 'array', actual: 'string' }])
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
    function myAdapter(r: unknown) { return r }
    registry.register({ adapter: myAdapter })
    const entry = registry.get(myAdapter)
    expect(entry).toBeDefined()
    expect(entry?.id).toBe('myAdapter')
  })

  it('未注册返回 undefined', () => {
    function unknownAdapter(r: unknown) { return r }
    expect(registry.get(unknownAdapter)).toBeUndefined()
  })

  it('has 正确判断存在性', () => {
    function adapterB(r: unknown) { return r }
    function adapterC(r: unknown) { return r }
    registry.register({ adapter: adapterB })
    expect(registry.has(adapterB)).toBe(true)
    expect(registry.has(adapterC)).toBe(false)
  })

  it('重复注册覆盖旧值', () => {
    function adapterD(r: unknown) { return r }
    registry.register({ adapter: adapterD, viewSchema: { a: 1 } })
    registry.register({ adapter: adapterD, viewSchema: { b: 2 } })
    const entry = registry.get(adapterD)
    expect(entry?.viewSchema).toEqual({ b: 2 })
  })

  it('clear 清空所有注册', () => {
    function adapterE(r: unknown) { return r }
    registry.register({ adapter: adapterE })
    registry.clear()
    expect(registry.has(adapterE)).toBe(false)
  })

  it('viewSchema 工厂函数被调用，schema 自动推导', () => {
    function adapterF(r: unknown) { return r }
    registry.register({ adapter: adapterF, viewSchema: () => ({ name: 'test', age: 0 }) })
    const entry = registry.get(adapterF)
    expect(entry?.schema).toEqual({ name: '', age: 0 })
  })

  it('viewSchema 静态值自动推导 schema', () => {
    function adapterG(r: unknown) { return r }
    registry.register({ adapter: adapterG, viewSchema: { id: 1, label: 'foo' } })
    const entry = registry.get(adapterG)
    expect(entry?.schema).toEqual({ id: 0, label: '' })
  })

  it('不传 viewSchema 时 schema 为 undefined', () => {
    function adapterH(r: unknown) { return r }
    registry.register({ adapter: adapterH })
    const entry = registry.get(adapterH)
    expect(entry?.schema).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════
// resolveMock
// ══════════════════════════════════════════════════════════

describe('resolveMock', () => {
  it('静态值直接返回', () => {
    expect(resolveMock('id', { foo: 1 })).toEqual({ foo: 1 })
  })

  it('工厂函数被调用并返回结果', () => {
    const fn = vi.fn(() => ({ name: 'mock' }))
    const result = resolveMock('my-id', fn)
    expect(fn).toHaveBeenCalled()
    expect(result).toEqual({ name: 'mock' })
  })

  it('无 viewSchema 返回 null', () => {
    expect(resolveMock('id', undefined)).toBeNull()
  })

  it('无 viewSchema 且 dev=true 时发出警告', () => {
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

// ══════════════════════════════════════════════════════════
// inferSchema
// ══════════════════════════════════════════════════════════

describe('inferSchema', () => {
  it('基础类型推导', () => {
    const schema = inferSchema({ name: '张三', age: 28, active: true })
    expect(schema).toEqual({ name: '', age: 0, active: false })
  })

  it('null / undefined 字段推导为 null', () => {
    const schema = inferSchema({ a: null, b: undefined })
    expect(schema).toEqual({ a: null, b: null })
  })

  it('嵌套对象递归推导', () => {
    const schema = inferSchema({ user: { id: 1, name: 'foo' } })
    expect(schema).toEqual({ user: { id: 0, name: '' } })
  })

  it('数组取第一个元素推导', () => {
    const schema = inferSchema({ list: [{ id: 1, label: 'a' }] })
    expect(schema).toEqual({ list: [{ id: 0, label: '' }] })
  })

  it('空数组推导为 []', () => {
    const schema = inferSchema({ list: [] })
    expect(schema).toEqual({ list: [] })
  })

  it('数组元素非对象时推导为 []', () => {
    const schema = inferSchema({ tags: ['vue', 'ts'] })
    expect(schema).toEqual({ tags: [] })
  })

  it('inferSchema 输出可直接作为 validateSchema 的 schema 参数', () => {
    const mock = { userName: '张三', mobile: '13800138000', age: 28 }
    const schema = inferSchema(mock)
    const diff = validateSchema('test', { userName: 'foo', mobile: '138', age: 30 }, schema)
    expect(diff.missingFields).toEqual([])
    expect(diff.typeMismatches).toEqual([])
  })
})
