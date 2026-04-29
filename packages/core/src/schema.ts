import type { Schema } from './types'

/** adapter 输出与 schema 定义之间的差异描述 */
export interface SchemaDiff {
  /** 对应的接口 ID */
  id: string
  /** schema 中定义但 adapter 输出中缺失的字段 */
  missingFields: string[]
  /** adapter 输出中存在但 schema 未定义的多余字段 */
  extraFields: string[]
  /** 字段存在但类型与 schema 定义不一致的条目 */
  typeMismatches: Array<{ field: string; expected: string; actual: string }>
}

/**
 * 对比 adapter 输出（data）与 schema 定义，返回差异详情。
 *
 * 校验规则：
 * - missingFields：schema 中有但 data 中没有的字段（真正缺失，需关注）
 * - extraFields：data 中有但 schema 未定义的字段（可能是 adapter 多映射，仅供参考）
 * - typeMismatches：字段存在但 typeof 类型不一致（null 值跳过类型检查）
 *
 * @param id     接口唯一 ID，用于报告定位
 * @param data   adapter 转换后的 ViewModel 对象
 * @param schema 期望的 ViewModel 结构（字段名 → 默认值，类型由默认值推断）
 */
export function validateSchema(id: string, data: unknown, schema: Schema): SchemaDiff {
  const diff: SchemaDiff = { id, missingFields: [], extraFields: [], typeMismatches: [] }

  if (typeof data !== 'object' || data === null) return diff

  const dataObj = data as Record<string, unknown>
  const schemaKeys = Object.keys(schema)
  const dataKeys = Object.keys(dataObj)

  for (const key of schemaKeys) {
    if (!(key in dataObj)) {
      diff.missingFields.push(key)
    } else {
      const expectedType = typeof schema[key] // schema的数据类型
      const actualType = typeof dataObj[key]  // 实际adapterz转换后的数据类型
      // null 值不做类型断言，避免误报
      if (expectedType !== actualType && schema[key] !== null && dataObj[key] !== null) {
        diff.typeMismatches.push({ field: key, expected: expectedType, actual: actualType })
      }
    }
  }

  for (const key of dataKeys) {
    if (!schemaKeys.includes(key)) {
      diff.extraFields.push(key)
    }
  }

  return diff
}

/**
 * 判断 diff 结果是否存在需要关注的差异。
 *
 * extraFields 不计入"有差异"，因为 adapter 多映射字段属于正常情况。
 * 只有 missingFields 或 typeMismatches 非空才视为真正的差异。
 *
 * @param diff validateSchema 返回的差异对象
 */
export function hasDiff(diff: SchemaDiff): boolean {
  return diff.missingFields.length > 0 || diff.typeMismatches.length > 0
}
