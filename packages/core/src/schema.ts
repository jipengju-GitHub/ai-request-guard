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

function compareObject(
  dataObj: Record<string, unknown>,
  schemaObj: Record<string, unknown>,
  diff: SchemaDiff,
  prefix: string
): void {
  const schemaKeys = Object.keys(schemaObj)
  const dataKeys = Object.keys(dataObj)

  for (const key of schemaKeys) {
    const fieldPath = prefix ? `${prefix}.${key}` : key
    if (!(key in dataObj)) {
      diff.missingFields.push(fieldPath)
    } else {
      const schemaVal = schemaObj[key]
      const dataVal = dataObj[key]

      if (schemaVal === null || dataVal === null) continue

      if (Array.isArray(schemaVal)) {
        if (!Array.isArray(dataVal)) {
          diff.typeMismatches.push({ field: fieldPath, expected: 'array', actual: typeof dataVal })
        } else {
          const templateItem = schemaVal[0]
          if (templateItem !== null && templateItem !== undefined && typeof templateItem === 'object') {
            const firstData = dataVal.find((item: unknown) => item !== null && item !== undefined)
            if (firstData && typeof firstData === 'object') {
              compareObject(
                firstData as Record<string, unknown>,
                templateItem as Record<string, unknown>,
                diff,
                `${fieldPath}[]`
              )
            }
          }
        }
      } else if (typeof schemaVal === 'object') {
        if (typeof dataVal !== 'object') {
          diff.typeMismatches.push({ field: fieldPath, expected: 'object', actual: typeof dataVal })
        } else {
          compareObject(
            dataVal as Record<string, unknown>,
            schemaVal as Record<string, unknown>,
            diff,
            fieldPath
          )
        }
      } else {
        const expectedType = typeof schemaVal
        const actualType = typeof dataVal
        if (expectedType !== actualType) {
          diff.typeMismatches.push({ field: fieldPath, expected: expectedType, actual: actualType })
        }
      }
    }
  }

  for (const key of dataKeys) {
    if (!schemaKeys.includes(key)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key
      diff.extraFields.push(fieldPath)
    }
  }
}

/**
 * 对比 adapter 输出（data）与 schema 定义，返回差异详情。
 * 支持嵌套对象和数组结构的递归校验。
 */
export function validateSchema(id: string, data: unknown, schema: Schema): SchemaDiff {
  const diff: SchemaDiff = { id, missingFields: [], extraFields: [], typeMismatches: [] }

  if (typeof data !== 'object' || data === null) return diff

  const target = Array.isArray(data) ? data.find((item) => item !== null && item !== undefined) : data
  if (target === undefined) return diff

  compareObject(target as Record<string, unknown>, schema, diff, '')

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

/**
 * 根据 schema 声明的结构递归裁剪数据，只保留 schema 中定义的字段。
 */
export function pickBySchema(data: unknown, schema: Schema): unknown {
  if (data === null || data === undefined) return data

  if (Array.isArray(data)) {
    const templateItem = Object.values(schema)[0]
    if (Array.isArray(templateItem) && templateItem[0] && typeof templateItem[0] === 'object') {
      return data.map(item => pickBySchema(item, templateItem[0] as Schema))
    }
    return data
  }

  if (typeof data !== 'object') return data

  const result: Record<string, unknown> = {}
  const schemaKeys = Object.keys(schema)

  for (const key of schemaKeys) {
    if (!(key in (data as Record<string, unknown>))) continue
    const schemaVal = schema[key]
    const dataVal = (data as Record<string, unknown>)[key]

    if (Array.isArray(schemaVal)) {
      if (Array.isArray(dataVal) && schemaVal[0] && typeof schemaVal[0] === 'object') {
        result[key] = dataVal.map(item => pickBySchema(item, schemaVal[0] as Schema))
      } else {
        result[key] = dataVal
      }
    } else if (schemaVal !== null && typeof schemaVal === 'object') {
      result[key] = pickBySchema(dataVal, schemaVal as Schema)
    } else {
      result[key] = dataVal
    }
  }

  return result
}
