---
banner: Assets/banner.gif
banner_y: "0.5"
banner_lock: "true"
author: Penn Ji
created: 2026-04-28 13:43:04
---
# AIRequestGuard SDK 方案设计（JS优先 + AI防腐层 + Adapter架构）

> 目标：为 Vue2 / React / jQuery 等新老项目提供统一“接口防腐层 + 数据契约治理能力”，同时兼容 TS，并支持 AI 辅助生成 Adapter。

---

# 1. 背景问题

当前前端开发常见问题：
- 后端接口字段经常变化
- Mock 数据与真实接口不一致
- YApi 接口文档与前端结构脱节
- 老项目没有统一 API 层
- 多页面重复做字段映射
- 联调成本高

---

# 2. 方案核心思想

## 核心理念

> 后端返回的是 DTO，前端使用的是 ViewModel，中间必须有“稳定转换层（Adapter）”。

---

## 架构原则

```text
后端接口（不稳定）
        ↓
Adapter 防腐层（稳定）
        ↓
前端 ViewModel（稳定）
        ↓
页面使用
```

## SDK 总体架构

```text
src/
  api/            接口定义层
  adapters/       防腐层（核心）
  request/        请求层封装
  mock/           mock数据
  tools/
    AIRequestGuard/
      index.js    核心运行时
      registry.js adapter注册中心
      schema.js   schema定义
      ai.js       AI辅助模块（可选）
```

# 核心API设计

## 4.1 接口定义（JS优先）

```javascript
import AIRequestGuard from 'tools/AIRequestGuard'

export function getUserDetail(id){
  return AIRequestGuard({
    id: 'user-detail',

    request: () => request.get('/user/' + id),

    schema: {
      id: 0,
      userName: '',
      mobile: ''
    }
  })
}
```
## 4.2 Adapter注册


```javascript
AIRequestGuard.register('user-detail', function(raw){
  return {
    id: raw.user_id,
    userName: raw.username,
    mobile: raw.phone
  }
})
```
## 4.3 页面使用

```javascript
getUserDetail(1).then(res => {
  console.log(res.userName)
})
```

# 5. 运行时模式设计
## 5.1 开发模式（Dev）

```text
请求接口
↓
校验 schema
↓
检测字段差异
↓
提示映射建议
↓
可生成 adapter
```

特点：
-  强提示
-  可生成代码
-  可接 AI

## 5.2 生产模式（Prod）
```text
请求接口
↓
执行 adapter（纯函数）
↓
返回 ViewModel
```
特点：

- 无 AI
- 无额外网络
- 性能稳定

# 6. Adapter防腐层设计
## 示例

```js
function userAdapter(raw){
  return {
    id: raw.user_id,
    userName: raw.username,
    mobile: raw.phone_no,
    deptName: raw.dept?.name
  }
}
```
---

## 能力支持

- 字段映射
- 默认值补齐
- 嵌套结构处理
- 数组转换
- 类型转换

---

# # 7. Mock体系集成

```js
mode: 'mock'
```

优先读取：

```text
/mock/user.js
```

用途：
- 后端未完成时开发
- UI先行开发模式

---

# 8. 多框架支持

## Vue2 / Vue3
```js
mounted(){   getUserDetail(1) }
```

---

## React

```js
useEffect(() => {   getUserDetail(1) }, [])
```

---

## jQuery

```js
`$('#btn').click(() => {   getUserDetail(1) })`
```

---

# 9. AI能力设计（关键模块）

---

## 9.1 AI使用场景

### 字段自动映射
```text
username -> userName
phone_no -> mobile
create_time -> time
```

---

### 自动生成 Adapter

输入：
```json
raw + schema
```

输出：
```js
adapter function
```

---

### 接口变更影响分析

```text
user_name 修改为 username
影响：
- 用户列表页
- 详情页
```
---

## 9.2 是否必须AI接口？

### 不建议线上依赖AI

原因：

- 成本高
- 延迟高
- 不稳定

---

## ✔ 正确方式

```text
开发阶段：AI辅助生成
生产阶段：纯Adapter执行
```

---

## 9.3 AI接入方式

支持：
内部ai接口或者接入Deepseek模型

---

## 9.4 AI调用方式

```js
AIRequestGuard.sync()
```
或 CLI：

```bash
npx ai-request sync
```
---

# 10. 性能设计

## 线上只做：

```text
raw -> adapter -> viewModel
```

### 开销极低：

- 纯JS函数
- 无网络请求
- 无AI计算

---

# 11. YApi / apifox对接

支持：YApi

能力：
- 拉接口列表
- 拉接口详情
- 检测更新时间
- 导出 Swagger/OpenAPI

---

# 12. 推荐演进路线

---

## v1（基础版）

- request封装
- adapter注册
- mock支持
- JS优先

---

## v2（工程化）

- TS类型生成
- YApi同步
- schema校验
- dev提示

---

## v3（AI增强）

- 自动生成adapter
- 字段语义识别
- 接口变更分析
- PR自动生成

---

# 13. 关键设计总结

## 核心原则

> AI只参与“生成阶段”，不参与“运行阶段”

---

## 最终架构

```text
开发期：
AI + schema + yapi

构建期：
生成 adapter

运行期：
纯 JS adapter
```
---

# 14. 价值总结

该方案可实现：

- 老系统零侵入升级
- 前后端字段解耦
- 接口变更影响收敛
- 联调成本降低 50%~80%
- 支持长期演进架构

# 15. 一句话定义

> AIRequestGuard = “前端接口防腐层 + AI驱动的契约治理系统”

---

# 16. 工程结构设计

## Monorepo 结构

```text
ai-request-guard/
  packages/
    core/               核心包（@ai-request-guard/core）
      src/
        index.ts        主入口
        guard.ts        AIRequestGuard 核心运行时
        registry.ts     adapter 注册中心
        schema.ts       schema 校验 + diff 检测
        mock.ts         mock 模式
        yapi.ts         YApi 同步模块
        reporter.ts     diff 报告生成
        types.ts        公共类型定义
      rollup.config.ts  打包配置
      tsconfig.json
      package.json
  playground/           本地开发测试
    src/
      api/              示例接口定义
      adapters/         示例 adapter
      mock/             示例 mock 数据
    vite.config.ts
    package.json
  docs/                 VitePress 文档
    index.md
    guide/
    api/
    package.json
  package.json          workspace 根配置（pnpm）
```

## 构建工具选型

- **打包**：Rollup（稳定）或 Rolldown（更快，Rust实现），产物同时输出 ESM / CJS / UMD
- **语言**：TypeScript 实现，发布时附带 `.d.ts`，使用时 JS 优先无需配置
- **包管理**：pnpm workspace
- **文档**：VitePress

---

# 17. 开发阶段计划

## Stage 1 — 工程骨架搭建

**目标**：跑通 Monorepo + 构建 + Playground 联调

任务清单：
- [ ] 初始化 pnpm workspace，配置 `packages/core` 和 `playground`
- [ ] 配置 Rollup / Rolldown 产出 ESM / CJS / UMD 三种格式
- [ ] 配置 TypeScript，确保 `core` 构建产物携带类型声明
- [ ] Playground 通过 Vite 本地引用 `core` 包，验证热更新链路
- [ ] 基础 CI 结构（lint + build 脚本）

**交付验证**：`pnpm dev` 启动 playground，修改 core 代码能热更新

---

## Stage 2 — 核心运行时（无AI）

**目标**：实现 V1 核心能力，生产可用

### 2.1 AIRequestGuard 主函数

```ts
AIRequestGuard({
  id: 'user-detail',
  request: () => fetch('/user/1'),
  schema: { id: 0, userName: '', mobile: '' }
})
```

- 执行 `request()`
- 查找注册的 adapter，有则执行，无则原始数据透传 + dev 模式 console.warn
- 返回 ViewModel Promise

### 2.2 adapter 注册中心

```ts
AIRequestGuard.register('user-detail', (raw) => ({
  id: raw.user_id,
  userName: raw.username,
  mobile: raw.phone
}))
```

- 全局注册表
- 支持覆盖注册（dev 模式警告重复注册）

### 2.3 schema 校验 + dev 字段 diff

- 对比 `schema` 定义的字段 vs adapter 返回的字段
- 检测：缺失字段 / 多余字段 / 类型不匹配
- dev 模式下 console.warn 输出差异详情

### 2.4 mock 模式

```ts
AIRequestGuard.setMode('mock')       // 全局切换
AIRequestGuard({ ..., mode: 'mock' }) // 单接口切换
```

- mock 模式下跳过真实请求，读取 mock 数据
- 生产构建时 mock 代码 tree-shake 掉（通过环境变量 + 条件编译）

**交付验证**：playground 跑通完整链路（注册 → 调用 → schema 校验 → mock 切换）

---

## Stage 3 — Dev 报告系统

**目标**：字段差异可视化，双击可查看

### 3.1 diff 报告生成（reporter.ts）

- 收集每次请求的 schema diff 数据
- 生成 `ai-request-guard-report.html` 到项目根目录
- HTML 自包含（内联 CSS/JS），双击浏览器直接打开

报告内容：
```text
接口 ID         字段差异              建议
user-detail     缺失: deptName        raw.dept?.name
order-list      多余: raw.extra_flag  可忽略或映射
```

### 3.2 devServer 集成

- 提供 Vite 插件（`@ai-request-guard/vite-plugin`）
- devServer 启动时自动生成初始报告
- 每次请求后增量更新报告文件

**交付验证**：playground 发起请求后，根目录生成 HTML 报告，双击可查看

---

## Stage 4 — YApi 集成

**目标**：自动同步接口 schema，检测接口变更

### 4.1 YApi 拉取模块（yapi.ts）

能力：
- 拉接口列表
- 拉接口详情（字段结构）
- 对比本地 schema，输出变更 diff

### 4.2 自动同步触发

```ts
// vite.config.ts
import { aiRequestGuardPlugin } from '@ai-request-guard/vite-plugin'

export default {
  plugins: [
    aiRequestGuardPlugin({
      yapi: {
        url: 'http://yapi.company.com',
        token: 'xxx',
        autoSync: true  // devServer 启动时自动拉取，默认 true
      }
    })
  ]
}
```

### 4.3 CLI 支持

```bash
npx ai-request-guard sync   # 手动触发 YApi 同步
npx ai-request-guard report # 手动生成 diff 报告
```

**交付验证**：devServer 启动自动同步 + CLI 手动跑均可触发，报告含 YApi diff 信息

---

## Stage 5 — TS 类型生成 + 文档

**目标**：工程化收尾，对外发布 V1

### 5.1 类型生成

- 根据 schema 定义推导 ViewModel 类型（TS 泛型或 codegen）
- `AIRequestGuard<T>()` 返回 `Promise<T>`，IDE 可自动补全

### 5.2 VitePress 文档

覆盖：
- 快速上手
- 核心 API 参考
- adapter 编写指南
- mock 使用说明
- YApi 集成配置
- Vite 插件配置

### 5.3 发布准备

- `packages/core` 配置 `publishConfig`
- 输出格式：ESM（推荐）/ CJS（兼容老项目）/ UMD（CDN 引入 jQuery 项目）
- README + CHANGELOG

**交付验证**：`npm publish` 发布后，可在 Vue2 / Vue3 / React / jQuery 项目中正常使用

---

## Stage 6（V2）— AI 增强

**目标**：接入 DeepSeek，实现 AI 辅助 adapter 生成

- 开发阶段：根据 raw + schema 调用 DeepSeek 接口，自动生成 adapter 函数
- 字段语义识别：`username -> userName` 等命名风格映射
- 接口变更影响分析：哪些页面用了变更的字段
- `AIRequestGuard.sync()` 运行时 AI 调用入口
- CLI `npx ai-request-guard ai-gen` 批量生成

---

## 阶段里程碑总览

| Stage | 核心产出 | 估算工作量 |
|-------|---------|-----------|
| Stage 1 | Monorepo 骨架 + 构建链路 | 0.5 天 |
| Stage 2 | 核心运行时（注册/调用/mock） | 1.5 天 |
| Stage 3 | Dev 报告 HTML 生成 | 1 天 |
| Stage 4 | YApi 集成 + CLI | 1.5 天 |
| Stage 5 | TS 类型 + 文档 + 发布 | 1 天 |
| Stage 6 | AI 增强（V2） | 待定 |
| **V1 合计** | | **约 5.5 天** |