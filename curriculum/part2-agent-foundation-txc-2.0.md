# Part 2 讲义：txc-2.0 Agent 基础建设

> 阶段目标（对应课程图）：**学会 AI Coding，与 AI 在工程规范下协作**。
> 课程图顺序：AI Coding →（Koa2→NestJS、Webpack5→Vite）→ SDD。
> 讲义建议顺序：先学 AI Coding 与 SDD（方法论），再做两次迁移（实战练习场）——迁移是「与 AI 在工程规范下协作」的最佳练习。按学习路线表：第 7 周 AI Coding、第 8 周 SDD、第 9 周 NestJS 迁移、第 10 周 Vite 迁移。

---

## 模块 1：AI Coding（第 7 周）

### 学完你能做什么

把 AI 编码工具（Cursor / Claude Code / Copilot 任选其一深耕）从「自动补全玩具」用成「可托付初级工作的结对工程师」，并且**质量责任始终在人**。

### 核心认知：AI Coding 的三个失败模式

| 失败模式 | 现象 | 对策 |
| --- | --- | --- |
| 上下文缺失 | AI 生成与现有代码风格冲突、重复造已有轮子 | 提供规则文件 + 相关文件上下文，别让它猜 |
| 无规格生成 | 一句话需求生成 500 行，方向错了 whole-scale 重写 | 先写规格（→ 模块 2 的 SDD），再让 AI 按规格实现 |
| 无评审合并 | 「能跑就合」，埋下安全、边界、可维护性地雷 | AI 产出必须过人评审 + 测试，PR 描述由人写 |

### 上下文工程（这是核心技能，不是提示词技巧）

1. **规则文件常驻**：项目根放 `AGENTS.md` / `.cursorrules`，写清技术栈、目录约定、错误处理规范、禁用事项。让 AI 一开口就是「自己人」。
2. **按任务给上下文**：指名具体文件与符号（「参考 `apps/api/src/order.service.ts` 的写法」），而不是让 AI 全库扫。
3. **任务拆解**：大需求拆成「模型 → 接口 → 实现 → 测试」四步，每步一个独立会话/提交，出错可回退。
4. **反向利用 AI**：让它先**复述需求、列出疑问**，再动手写——分歧在这一步暴露最便宜。

### 与 AI 协作的标准循环

```text
写规格 → 让 AI 复述+提问 → AI 生成实现 → 人评审（安全/边界/命名/过度设计）
→ 跑测试与契约测试 → 人写 PR 描述并合并 → 把踩坑补进规则文件
```

### 实操任务

1. 给本仓库写一份 `AGENTS.md`（含分层规范、命名、错误码、测试要求），之后所有练习强制走它。
2. 选 `apps/api` 里一个真实小需求（如「会话列表分页」），完整走一遍标准循环，保留「规格 / AI 提问 / 生成代码 / 你的评审意见 / 修改 diff」五份记录。
3. 刻意制造一次失败：不给上下文让 AI 直接写，对比两次产出差异，写进复盘。

### 验收标准

- [ ] 能说出并演示三个失败模式的真实案例。
- [ ] 有一份被 3 个以上任务验证过的规则文件（AI 产出返工率明显下降）。
- [ ] 能解释「为什么 AI 生成代码的责任在人」并给出你的评审 checklist。

---

## 模块 2：SDD 规格驱动开发（第 8 周）

### 学完你能做什么

用「规格先行」替代「聊需求 → 拍脑袋 → 改到死」：规格即需求、即测试、即文档，AI 按规格生成，测试锁住行为。

### 核心概念

- **SDD（Spec-Driven Development）**：动手前先产出机器可校验的规格——接口契约、数据模型、验收标准；实现和测试都从规格派生。
- **规格的三个组成部分**：
  1. **接口契约**：OpenAPI / TypeScript 类型，字段名、类型、错误码一一列明（呼应仓库纪律：不猜字段、不造别名）。
  2. **数据模型**：聚合与字段变更，迁移脚本先行。
  3. **验收标准**：Given/When/Then 列表，每条可转成一个测试用例。
- **契约测试**：把接口契约变成自动化测试，AI 改动只要破坏契约，CI 立刻红。

### 规格模板（沉淀成你自己的模板库）

```markdown
# 规格：<功能名>
## 用户故事
作为 <角色>，我想 <动作>，以便 <价值>。
## 接口契约
POST /sessions/{id}/messages
  请求：{ content: string, role: 'user' }        // 字段逐一列出，不许 "等类似" 字样
  响应 200：{ id, content, role, createdAt }
  错误：404 会话不存在 / 422 content 为空或超长 / 429 限流
## 数据模型
Message 新增字段：…；迁移脚本：…
## 验收标准（Given/When/Then）
- Given 一个存在会话，When 发送合法消息，Then 返回 200 且消息入库，createdAt 为服务端时间
- Given 不存在会话，When 发消息，Then 404 且不产生脏数据
## 非功能
分页上限 50；P95 < 300ms；所有错误带 requestId
```

### 实操任务

1. 把模块 1 的分页需求**重写**成完整规格，对比「一句话需求」下 AI 的产出质量差异。
2. 用 OpenAPI（或 zod/tsoa 任选）定义契约，生成契约测试；让 AI 实现，测试不过就打回。
3. 刻意改一处契约字段名，验证 CI 契约测试真的能拦住。
4. 模板入库：`curriculum/templates/spec-template.md`，后续 Part 3、4 全部用它。

### 验收标准

- [ ] 有一个「规格 → AI 实现 → 契约测试全绿 → 合并」的完整闭环记录。
- [ ] 能解释规格、实现、测试三者的派生关系：改谁必须同步谁。
- [ ] 面试能讲：「AI 时代人的价值从写代码上移到定规格与评审」——并给出你自己的证据。

---

## 模块 3：框架迁移 Koa2 → NestJS（第 9 周）

### 学完你能做什么

掌握一次真实的技术栈迁移：为什么迁、怎么双轨共存、怎么灰度切换、怎么证明「迁完行为没变」。

### 为什么值得迁（面试必考）

Koa2 灵活但「约定靠自觉」；NestJS 用装饰器 + 依赖注入带来：模块化边界、可测试性（依赖可替换）、统一生态（Config/Validation/TypeORM/微服务）、团队协作成本下降。**代价**：学习曲线、装饰器元编程的隐蔽性、启动时反射开销。

### NestJS 核心四件套（对照 Koa 概念迁移）

| Koa 世界 | NestJS 对应物 |
| --- | --- |
| 中间件（洋葱） | Middleware / Guard（前置鉴权）/ Interceptor（环绕，切面）/ ExceptionFilter（错误兜底） |
| 手动 new Service 传入 | 构造函数注入 `@Injectable()` + Module providers |
| router + controller 分离 | `@Controller` + `@Get` 装饰器声明式路由 |
| 校验中间件 | `ValidationPipe` + class-validator DTO |

最小样例（必须能默写）：

```ts
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {} // DI 容器自动装配

  @Post(':id/messages')
  async send(@Param('id') id: string, @Body() dto: CreateMessageDto) {
    return this.sessionService.sendMessage(id, dto);
  }
}
```

### 迁移策略：绞杀者模式（Strangler Fig）

```text
1. 新建 NestJS 应用作为壳，反代/挂载旧 Koa 应用 → 新旧共存
2. 按模块迁移：一个模块 = 路由对齐 + 行为对比测试通过 → 切流量到新实现
3. 旧模块只读冻结；全部迁完再下线旧应用
红线：接口 URL、字段、错误码行为不变；每次切换有对比测试背书
```

### 实操任务

1. 把站 1 的 Koa 服务（2～3 个模块）迁到 NestJS：先迁「健康检查 + 一个查询模块」，再迁「写路径模块」。
2. 为每个接口写「行为对比测试」：同一请求分别打旧、新实现，断言响应 JSON 全等。
3. 演练双轨：网关按模块开关切换新旧实现，记录切换与回退过程。

### 常见坑

- `tsconfig` 忘开 `emitDecoratorMetadata` + `experimentalDecorators`：DI 全线报「无法解析依赖」。
- 在模块间制造循环依赖：`forwardRef` 是止血不是方案，重新切模块边界。
- 把 Koa 的 ctx 使用习惯带进 Nest：Nest 里不要碰原始 req/res，用装饰器取参。

### 验收标准

- [ ] 双轨期间所有接口行为对比测试全绿。
- [ ] 能白板讲绞杀者模式四步与回退方案。
- [ ] 能解释 NestJS 依赖注入的原理（装饰器元数据 + 反射 + 容器装配）。

---

## 模块 4：构建迁移 Webpack5 → Vite（第 10 周）

### 学完你能做什么

完成前端构建体系升级，并用数据证明收益；掌握「构建工具迁移」的通用方法论（插件对齐 → 环境变量 → 产物验证）。

### 为什么 Vite 快（原理，面试必考）

```text
Webpack dev：启动时全量打包 → 可启动慢；HMR 按模块链重编
Vite dev：  启动零打包，浏览器请求哪个模块就按需编译哪个（原生 ESM）
            依赖用 esbuild 预构建（Go，比 JS 打包器快 10~100 倍），node_modules 整体缓存
Vite build：生产用 Rollup（成熟分包与摇树），dev/prod 双引擎
代价：dev 走原生 ESM，大量小请求瀑布；部分依赖行为与 bundle 模式有差异，需预构建对齐
```

### 迁移四步法

1. **依赖对齐**：插件映射表——`HtmlWebpackPlugin→vite-plugin-html`、CSS 提取（build 内建）、`DefinePlugin→define`。
2. **入口与 HTML**：`index.html` 移到根目录并成为入口；`<script type="module" src="/src/main.ts">`。
3. **环境变量**：`process.env.X` → `import.meta.env.VITE_X`；敏感值必须仍只走后端。
4. **产物验证**：构建产物体积、首屏资源数、构建时长三组数据对比；回归核心页面。

### 实操任务

1. 把站 4 的组件库文档站 + 业务 demo 从 Webpack 迁到 Vite，记录三组对比数据（目标：dev 冷启动 < 2s，build 提速 ≥ 50%）。
2. 配置 `vite.config.ts`：别名、代理（指向本地 API）、手动分包（vendor / ui 分 chunk）。
3. 处理一个真实 CommonJS 依赖的预构建问题（`optimizeDeps.include`），记录现象与解法。

### 常见坑

- 环境变量没加 `VITE_` 前缀：客户端取不到且不报错，页面「静默丢配置」。
- dev 正常、build 报 CJS 循环引用：预构建清单与生产 Rollup 行为差异，用 `build.commonjsOptions` 或换依赖。
- 代理只配了 dev：忘了 build 后的联调方案（nginx 或网关），部署才发现接口 404。

### 验收标准

- [ ] 有迁移前后量化对比（冷启动、HMR、build 时长、产物体积）。
- [ ] 能解释 Vite dev 与 build 为什么是双引擎、各用什么。
- [ ] 迁移后核心路径手工回归 + 构建检查全绿。

---

## Part 2 毕业检查（第 10 周末）

- [ ] 四模块验收全部打勾。
- [ ] 产出物入库：`AGENTS.md` 规则文件、SDD 模板库、NestJS 迁移后的服务、Vite 化的前端、两份迁移报告。
- [ ] txc-2.0 底座成型：NestJS 服务 + Vite 前端可联调跑通（为 Part 3 铺路）。
- [ ] 更新 `99-interview-highlights.md`：「如何用 AI 与 SDD 完成一次技术栈迁移」的故事线。
