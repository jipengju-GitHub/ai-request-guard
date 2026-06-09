# @ai-request-guard/core

前端防腐层核心运行时。提供 adapter 注册、mock 系统、schema 校验，以及开发模式下的真实请求拦截能力。

## 安装

```bash
pnpm add @ai-request-guard/core
```

## 基本用法

```typescript
import AIRequestGuard from '@ai-request-guard/core'

// 定义 adapter 函数
function getUserDetailAdapter(raw: unknown) {
  const r = raw as Record<string, unknown>
  const dept = (r.dept ?? {}) as Record<string, unknown>
  return {
    id: r.user_id as number,
    userName: (r.username as string) ?? '',
    mobile: (r.phone_no as string) ?? '',
    deptName: (dept.dept_name as string) ?? '未知部门',
    age: Number(r.age ?? 0),
    avatar: (r.avatar as string) ?? 'https://example.com/default.png',
    createTime: (r.create_time as string) ?? '',
  }
}

// 注册 adapter
AIRequestGuard.register({
  viewSchema: { id: 0, userName: '', mobile: '', deptName: '', age: 0, avatar: '', createTime: '' },
  adapter: getUserDetailAdapter,
})

// 发起请求
const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
})
```

## Mock

```typescript
// 全局切换到 mock 模式
AIRequestGuard.setMode('mock')

// 单接口 mock（静态数据）
const user = await AIRequestGuard({
  adapter: getUserDetailAdapter,
  request: () => fetch('/api/user/detail').then(r => r.json()),
  mode: 'mock',
})

// 通过 viewSchema 提供 mock 数据（工厂函数）
AIRequestGuard.register({
  viewSchema: () => ({ user_id: 1, username: 'test', phone_no: '138xxxxxxxx', age: '28' }),
  adapter: getUserDetailAdapter,
})
```

## 真实请求拦截（配合 Vite 插件）

```typescript
// 注册 URL 监听规则，GET 请求命中时自动上报 raw 数据
AIRequestGuard.watch('/api/user/detail', getUserDetailAdapter)
AIRequestGuard.watch(/\/api\/order\/\d+/, getOrderDetailAdapter)
```

## API 速览

| 方法 | 说明 |
|---|---|
| `AIRequestGuard(options)` | 发起请求并经 adapter 转换，返回 ViewModel |
| `AIRequestGuard.register(options)` | 注册 adapter（`{ adapter, viewSchema? }`）|
| `AIRequestGuard.configure(config)` | 更新全局配置（mode / dev）|
| `AIRequestGuard.setMode(mode)` | 切换全局请求模式 |
| `AIRequestGuard.watch(pattern, adapter)` | 注册 URL 拦截规则（dev only）|
| `AIRequestGuard.clearWatch()` | 清空拦截规则（dev only）|
| `validateSchema(id, data, schema)` | 手动执行 schema diff 校验 |
| `hasDiff(diff)` | 判断 diff 结果是否有需关注的差异 |
| `getDiffRecords()` | 获取内存中所有 diff 记录 |
| `clearDiffRecords()` | 清空 diff 记录 |

## 生产构建

mock 代码、schema 校验、fetch 拦截在生产构建中通过 `__DEV__` 标志 tree-shake，不进入线上产物，零额外开销。

配合 Rollup `@rollup/plugin-replace` 使用：

```typescript
replace({ __DEV__: "false", preventAssignment: true })
```

## License

MIT
