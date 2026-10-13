# Part 1 讲义：txc-1.0 全栈开发框架

> 阶段目标（对应课程图）：**具备完整的全栈项目开发与交付能力**。
> 六站按依赖顺序推进：服务框架 → 构建工程化 → 领域建模 → 组件库 → 包管理 → 容器与流水线。
> 建议节奏：每周一站（第 1～6 周），每站输出一个可验收物。

---

## 站 1：Node.js 服务框架

### 学完你能做什么

从空目录搭出一个生产可用的 Koa2 服务骨架：分层清晰、错误统一、日志可查、配置分环境、能优雅退出。

### 核心概念

- **洋葱模型**：Koa 中间件像洋葱层层包裹，`await next()` 之前的代码在请求进入时执行，之后的代码在响应返回时执行。
- **分层架构**：`router（接入）→ controller（参数校验与编排）→ service（业务逻辑）→ dao/model（数据）`。上层只能调用相邻下层。
- **统一错误处理**：最外层中间件 `try/catch` 包住 `await next()`，把业务错误（可预期的 4xx）与系统错误（5xx）分开。
- **配置分环境**：`development / test / production` 三套配置，敏感信息走环境变量，代码里只留默认值与结构定义。

### 原理讲解

Koa 的 `compose` 把中间件数组折叠成一个递归调用链。理解这一点后你能解释：

1. 为什么日志中间件要放在最外层（才能计时完整请求）。
2. 为什么某个中间件 `await next()` 抛错，会沿着调用栈向上冒泡给外层 `catch`。
3. 为什么响应体不要在中间件里直接写两次（会触发 `ctx.body` 覆盖或 404 异常）。

最小骨架（背下来，然后能默写）：

```ts
// app.ts
import Koa from 'koa';
import { bodyParser } from '@koa/bodyparser';
import { router } from './router';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logger';

const app = new Koa();
app.use(errorHandler);      // 1. 最外层：兜错误
app.use(requestLogger);     // 2. 计时 + requestId
app.use(bodyParser());      // 3. 解析
app.use(router.routes());   // 4. 路由

const server = app.listen(3000);
// 优雅退出：先停接新流量，再等在途请求完成
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
```

### 实操任务（产出：`service-bootstrap` 脚手架）

1. 实现 4 个中间件：errorHandler（含错误码规范）、requestLogger（requestId + 耗时）、notFound、rateLimiter（简单令牌桶即可）。
2. 实现 `GET /healthz`（存活）与 `GET /readyz`（依赖检查：DB 可连）——第 6 站 K8s 探针要用。
3. 目录固定为：`src/{middleware,router,controller,service,dao,config,utils}`。
4. 写一个 `service` 层单测证明：业务错误抛 `BusinessError(400, code)`，errorHandler 返回结构稳定的 JSON。

### 常见坑

- 中间件里 `setTimeout` 后再写 `ctx.body`：请求可能已结束，引发 `404` 或 unhandled rejection。
- 忘记 `await next()`：后面的中间件全部静默不执行，症状是「路由 404 但没报错」。
- 把密钥写进配置文件并提交：用 dotenv + `.gitignore`，配置文件只留结构。

### 验收标准

- [ ] 关闭资料，30 分钟内默写重写整套骨架并启动成功。
- [ ] 能解释洋葱模型的执行顺序（写一段带输出的验证代码）。
- [ ] 制造一个 service 层异常，日志里能看到 requestId、耗时、错误栈。

### 面试考点

洋葱模型 vs Express 线性模型；Koa 洋葱与 `async/await` 的关系；优雅退出为什么必须两步（停流量、再清现场）。

> 参考实现：本仓库 `lessons/00-roadmap/request-lifecycle-and-koa.md`。

---

## 站 2：Webpack 5 工程化

### 学完你能做什么

读懂任意 Webpack 配置；定位并优化一个慢构建；说清 loader 与 plugin 的本质区别；能手写一个 100 行左右的 mini-webpack。

### 核心概念

- **模块依赖图**：Webpack 从 `entry` 出发，把每个 `import/require` 解析成依赖图，再转换、拼接成 bundle。
- **Loader**：文件转换器（把非 JS 转成模块），单文件粒度、链式执行、**从右到左**。
- **Plugin**：通过 Tapable 钩子介入整个构建生命周期（如 `compilation`、`emit`），可拿到并改写产物。
- **Tree Shaking**：基于 ESM 静态结构 + `usedExports` + `package.json` 的 `sideEffects` 标记删除死代码。
- **持久化缓存**：`cache: { type: 'filesystem' }`，二次构建直接复用模块级缓存。

### 原理讲解：一次构建发生了什么

```text
初始化（读配置 → 合并 CLI 参数）
→ 从 entry 递归构建模块（resolve 路径 → loader 转换 → 收集依赖 → 生成 AST 依赖关系）
→ 封装 Chunk（按 splitChunks / 动态 import 边界切分）
→ 生成产物（module 拼成 bundle，写 dist）
→ 优化（压缩、tree shaking 在此阶段生效）
→ emit 写盘 → plugin 的 done 钩子
```

手写 mini-webpack 的核心三步（实操要求，≈100 行）：

```js
// 1. 读入口文件，用 @babel/parser 转出 AST，收集 import 声明 → 得到依赖数组
// 2. 递归对每个依赖重复步骤 1，形成 { filename: { code, deps } } 的依赖图
// 3. 拼一个自执行函数：模块表 + 自实现的 __webpack_require__（缓存 module.exports）
```

### 实操任务

1. 从零配一个 React/Vue 业务构建：`babel-loader/ts-loader` + `MiniCssExtractPlugin` + `HtmlWebpackPlugin`。
2. 路由级动态 `import()` 实现代码分割，用 `webpack-bundle-analyzer` 出一份优化前后对比（体积、首包、构建时长）。
3. 开启持久化缓存，记录二次构建提速数据。
4. 手写 mini-webpack，能跑通「两个文件相互引用」的最小用例。

### 常见坑

- `sideEffects: false` 写了却没生效：检查是否有 `@babel/preset-env` 把 ESM 转成了 CJS（转了就 shaking 不了）。
- loader 顺序写反：`['style-loader', 'css-loader']` 执行顺序是先 css 后 style。
- 开发环境用生产配置压缩导致 HMR 失效：`mode` 与 `devtool` 要按环境区分。

### 验收标准

- [ ] 白板画出「entry → 模块图 → chunk → bundle」流程。
- [ ] 给你一个 3 分钟的构建，能定位瓶颈（用 profile / analyzer）并给出至少两项优化。
- [ ] mini-webpack 独立重写成功。

### 面试考点

Loader vs Plugin；HMR 原理（webpack-dev-server 与模块热替换的 websocket + module 更新链）；tree shaking 为什么只认 ESM；Vite 为什么快（为站 4 与 Part 2 的迁移埋伏笔：dev 走原生 ESM 按需编译，esbuild 预构建，build 用 Rollup）。

---

## 站 3：领域模型与系统架构

### 学完你能做什么

拿到一个业务需求，能切出领域模型：实体、值对象、聚合、仓储，并画出四层架构图，说清模块边界与依赖方向。

### 核心概念

- **实体（Entity）**：有唯一标识、有生命周期，靠 ID 判断相等（如「订单」）。
- **值对象（Value Object）**：无标识、不可变，靠属性判断相等（如「金额 = 100 元」）。
- **聚合（Aggregate）**：一致性边界。聚合根是外部唯一入口，聚合内强一致，聚合间靠最终一致。
- **仓储（Repository）**：领域层定义接口，基础设施层实现——依赖倒置，业务不认识 SQL。
- **防腐层（ACL）**：调用外部系统时包一层翻译，外部模型不渗入本域。

### 四层架构（背下来）

```text
接入层    Router/Controller        协议适配、参数校验，无业务
应用层    Application Service      用例编排：调领域对象、发事务、发事件
领域层    Entity/VO/Domain Service 核心业务规则，不依赖任何框架和 DB
基础设施层 Repository/MQ/外部服务    实现领域层定义的接口
依赖方向：上层依赖下层；领域层依赖倒置（只定义接口）
```

### 实操任务（结合本仓库业务感最强的方式）

以 `projects/01-chat-workbench` 的「AI 对话工作台」为题材做建模：

1. 识别聚合：`Session`（会话聚合根，含 `Message` 实体列表）、`Prompt`（值对象）。
2. 写出领域规则：如「消息一旦发送不可修改，只能追加」「会话标题由首条消息摘要生成」。
3. 定义 `SessionRepository` 接口（领域层），在基础设施层用 PostgreSQL 实现（可对照 `lessons/03-postgres-persistence`）。
4. 画一张完整四层架构图，标注一次「发消息」请求的完整调用链。

### 常见坑

- **贫血模型**：service 全是过程式脚本，实体只有 getter/setter——规则散落各处，改一处崩三处。纠正：规则内聚到实体方法（`session.appendMessage()` 而不是 service 里裸写校验）。
- 聚合切太大（把整个系统切成一个聚合）或太小（每个字段一个聚合）。判断标准：**事务边界**。
- 跨聚合直接引用对象而不是 ID。

### 验收标准

- [ ] 给一个新需求（如「课程订阅」），15 分钟内列出聚合、实体、值对象、仓储接口。
- [ ] 能解释「为什么聚合间只能传 ID 不能传对象」。
- [ ] 架构图能讲 5 分钟不卡壳。

### 面试考点

聚合根怎么划分；领域服务与应用服务的区别；依赖倒置在分层架构里的落点；防腐层解决什么问题。

---

## 站 4：Vue 3 动态组件库

### 学完你能做什么

搭建一个主题可换、按需引入、文档可查的业务组件库，并实现「配置驱动的动态表单/物料渲染」——这是低代码与动态页面的地基。

### 核心概念

- **组合式 API**：`setup` + `ref/computed/watch`，逻辑按功能聚合而非按选项分散；自定义 `composable` 复用状态逻辑。
- **响应式原理**：Vue 3 用 `Proxy` 惰性代理，访问时收集依赖（track），赋值时触发更新（trigger）——对比 Vue 2 的 `Object.defineProperty`（需递归、无法感知新增属性）。
- **动态组件三件套**：`<component :is>`、`defineAsyncComponent`（异步分包）、`render` 函数 / `h()`（配置到 VNode 的映射）。
- **设计 Token**：颜色/间距/圆角/字号收敛为 CSS 变量，主题切换只换变量表。

### 动态渲染的最小实现（必须能手写）

```ts
// schema: { type: 'input' | 'select', props: {...} } → 组件映射表
const registry = {
  input: InputWidget,          // 静态注册
  select: defineAsyncComponent(() => import('./widgets/SelectWidget')), // 异步分包
};
// 模板中：<component :is="registry[item.type]" v-bind="item.props" />
```

### 实操任务（产出：组件库骨架）

1. monorepo 里新建 `packages/ui`（为站 5 发包做准备），用 Vite 库模式构建，输出 ESM + 类型。
2. 实现 3 个组件：`Input`、`Select`、`DynamicForm`（传 JSON schema 渲染整张表单并收集值）。
3. 主题 Token：默认主题 + 暗色主题两套 CSS 变量，一键切换。
4. 按需引入：配置 `unplugin-vue-components` 的 resolver；文档站用 VitePress 或 Storybook 任一。

### 常见坑

- `ref` 在模板自动解包、在 JS 里要 `.value`——漏写 `.value` 是最高频 bug。
- `defineAsyncComponent` 与路由懒加载（`() => import()`）是两回事，别混用场景。
- 组件库直接引业务代码：方向反了，组件库只能被业务依赖。

### 验收标准

- [ ] 能默写 Proxy 响应式的 track/trigger 流程（对照 Vue 源码的 `reactive.ts` 讲）。
- [ ] DynamicForm 接受任意新 widget 类型不改内核（只注册映射表）。
- [ ] 换主题不改任何组件代码。

### 面试考点

Vue 2/3 响应式差异；key 的作用与 diff 关系；动态组件与异步组件的区别；组件库如何做到 tree-shaking 友好（ESM + sideEffects 标记）。

---

## 站 5：npm 包抽象与发布

### 学完你能做什么

把可复用逻辑抽成规范的 npm 包：版本可追踪、变更可审计、发布可回滚、业务引用不漂移。

### 核心概念

- **monorepo 包管理**：pnpm workspace（本仓库已用），`workspace:*` 协议在仓库内互相引用，发布时替换成真实版本号。
- **语义化版本 semver**：`主.次.修订`——破坏性变更升主版本，向后兼容的功能升次版本，修 bug 升修订号。
- **changesets**：改动时声明「我要发版 + changelog」，合并后 CI 自动算版本、发 npm、写 CHANGELOG。
- **双引擎输出**：同时产出 ESM（`module`/`exports.import`）与 CJS（`require`），加 `types` 指向 d.ts。
- **peerDependencies**：宿主已有的依赖（如 vue、react）声明为 peer，避免双实例（双实例 = hooks 失效/上下文断裂的经典事故）。

### 发布生命周期（理解各钩子执行顺序）

```text
prepublishOnly → prepare → prepublishOnly 校验（跑测试+构建） → publish → postpublish
CI 流程：PR 合入 main → changesets 版本 PR → 合并版本 PR → 自动 publish → 打 git tag
```

### 实操任务

1. 把站 4 的 `packages/ui` 与一个工具包 `packages/shared`（本仓库已有，先读懂再增强）纳入 changesets 流程。
2. 发 `0.1.0` 到私有 registry（本地 Verdaccio 演练），再在 `apps/web` 里以 `workspace:*` 引用并演示构建产物里被替换为版本号。
3. 演练一次「破坏性变更」：升 `1.0.0`，CHANGELOG 标注 BREAKING CHANGE，说明迁移方式。
4. 故意把依赖错写成 `dependencies` 造成 Vue 双实例，复现问题后改成 `peerDependencies` 修复——把现象记进复盘。

### 常见坑

- `files` 字段没配，把 src、测试全发上去。
- 用 `latest` tag 乱发预发布版本：预发布用 `next` dist-tag。
- monorepo 内直接 `npm publish`：没走 changesets 版本计算，版本号漂移。

### 验收标准

- [ ] 能说清 `dependencies / peerDependencies / devDependencies` 三者区别与发包时的处理。
- [ ] 从改动到发布到业务引用更新，全流程不手工改版本号。
- [ ] 能回滚一次错误发布（`npm dist-tag` + revert 版本 PR）。

### 面试考点

如何设计团队的包发布流程；monorepo 下如何保证包版本一致性；为什么 UI 组件库必须 peer 依赖框架。

---

## 站 6：Docker·K8s·CI/CD

### 学完你能做什么

把前面所有产出容器化，搭一条「提交即构建、构建即部署」的流水线，并掌握发布、回滚、探针三件生产保命技能。

### 核心概念

- **镜像分层**：每条 Dockerfile 指令一层，层可缓存——依赖安装层放前面、源码 COPY 放后面，改代码不重装依赖。
- **多阶段构建**：builder 阶段装全量依赖编译，runtime 阶段只拷产物 + 生产依赖，镜像从 GB 级降到百 MB 级。
- **K8s 最小集合**：`Deployment`（无状态副本 + 滚动更新）、`Service`（稳定访问入口）、`Ingress`（七层路由）、`ConfigMap/Secret`（配置注入）。
- **探针**：`livenessProbe`（挂了重启）用 `/healthz`；`readinessProbe`（没就绪不接流量）用 `/readyz`——站 1 的伏笔在此兑现。
- **CI/CD 分层**：CI = lint → test → build（镜像推仓库）；CD = 按环境推进（dev 自动、prod 审批）。

### 生产级 Dockerfile 模板（必须能默写）

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/app.js"]
```

### 滚动发布与回滚

```text
发布：新 ReplicaSet 逐个起 Pod → readiness 通过才接流量 → 旧 Pod 缩容
回滚：kubectl rollout undo deployment/xxx（秒级回到上一 Revision）
灰度：按比例（如 5% 新版本）观察指标后再全量
```

### 实操任务

1. 用上面的模板容器化站 1 的服务，本地 `docker run` 验证 `/healthz`。
2. 写 K8s 清单（Deployment+Service+Ingress）或 docker-compose（本仓库已有，对照增强），本地 kind/minikube 部署。
3. GitHub Actions 流水线：`lint → test → docker build & push → deploy dev`；main 分支触发，PR 只跑前三步。
4. 演练：手动杀掉 Pod 观察自愈；发一个坏版本并回滚，记录恢复耗时。

### 常见坑

- `COPY . .` 在依赖安装之前：任何代码改动都击穿缓存重装依赖。
- 镜像里打进了 `.env` 密钥：Secret 走 K8s 注入，镜像保持无状态无密钥。
- 只有 liveness 没有 readiness：启动慢的服务在就绪前被打进流量，批量 5xx。
- CI 里跑的是「本地能跑」的测试（依赖本机端口/文件）：测试必须容器内可重复。

### 验收标准

- [ ] 镜像 < 300MB 且无 devDependencies。
- [ ] 手动 kill Pod，30 秒内服务自愈且流量无感（readiness 生效）。
- [ ] 一次完整的「坏版本发布 → 告警 → 回滚」演练记录。

### 面试考点

镜像怎么瘦身；滚动更新与蓝绿/金丝雀的取舍；readiness 与 liveness 区别；生产回滚方案。

---

## Part 1 毕业检查（第 6 周末）

全部通过才进入 Part 2：

- [ ] 六站验收全部打勾。
- [ ] 项目一 `txc-1.0`：一个 monorepo，含服务脚手架、组件库、已发包、CI/CD 全绿的完整交付链。
- [ ] 更新 `curriculum/99-interview-highlights.md` 中项目一的三个亮点。
- [ ] 写一篇复盘：六站里哪个概念最难、卡了多久、怎么突破的。
