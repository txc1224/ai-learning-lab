# AI 全栈实践课讲义（txc 路线）

> 本套讲义基于课程宣传图（`docs/微信图片_20261013111237_*.png` ～ `docs/微信图片_20261013111241_*.png`）
> 深度解析后重新设计，把「课程卖点」还原成「可教学、可验收、可写进简历」的讲义与学习路线。

## 课程定位

面向**有前端 / 传统后端经验、正在转型 AI 全栈与 Agent 开发的工程师**。

一句话主线：**从全栈工程，到 Agent 项目落地**。

```text
Part 1 全栈开发框架      Part 2 Agent 基础建设     Part 3 Agent 开发框架      Part 4 Agent 项目实践
(txc-1.0)             (txc-2.0)              (txc-2.0)               (简历智能分析系统)
─────────────────       ─────────────────        ─────────────────         ─────────────────
Node.js 服务框架        AI Coding                Agent Loop·ReAct          Python MCP 简历解析
Webpack 5 工程化        Koa2 → NestJS            LLM Gateway 多模型        Java MCP 简历算分
领域模型与架构          Webpack5 → Vite          Skill·Tools               Go MCP 岗位匹配
Vue 3 动态组件库        SDD 规格驱动开发          SSE Streaming·Trace       Qdrant + RAG 标准库
npm 包抽象与发布                                 MCP·RAG·Memory            多 Agents 协同
Docker·K8s·CI/CD                                Guardrail·Eval
─────────────────       ─────────────────        ─────────────────         ─────────────────
目标：完整全栈交付能力   目标：与 AI 在工程规范    目标：掌握 AI 应用原理，   目标：真实落地多 Agents
                        下协作                    构建可用 Agent 框架        协同，理解 FDE 能力版图
```

## 讲义目录

| 文件 | 内容 | 适合何时读 |
| --- | --- | --- |
| [00-learning-path.md](./00-learning-path.md) | 24 周学习路线、阶段验收、能力自评矩阵 | 入学前先读，之后每周末回来对照 |
| [part1-fullstack-txc-1.0.md](./part1-fullstack-txc-1.0.md) | Part 1 讲义：六站全栈框架 | 第 1～6 周 |
| [part2-agent-foundation-txc-2.0.md](./part2-agent-foundation-txc-2.0.md) | Part 2 讲义：AI Coding 与工程迁移、SDD | 第 7～10 周 |
| [part3-agent-framework-txc-2.0.md](./part3-agent-framework-txc-2.0.md) | Part 3 讲义：Agent 框架六层架构 | 第 11～18 周 |
| [part4-resume-multi-agent-project.md](./part4-resume-multi-agent-project.md) | Part 4 讲义：简历智能分析系统（多 Agents） | 第 19～24 周 |
| [99-interview-highlights.md](./99-interview-highlights.md) | 三个项目的简历亮点写法与面试题 | 每部分结束时 + 求职前 |

## 三个实战项目（也是三份简历素材）

1. **txc-1.0 全栈开发框架**：Node.js 服务框架 + Webpack 工程化 + Vue 3 组件库 + npm 发包 + Docker/K8s 交付。
2. **txc-2.0 Agent 开发框架**：Agent Loop、LLM Gateway、Skill/Tools、SSE 流式、MCP/RAG/Memory、Guardrail/Eval 的完整框架。
3. **简历智能分析系统**：NestJS 编排 + Python/Java/Go 三个 MCP 服务 + Qdrant RAG 的多 Agents 协同系统。

## 与本仓库已有课程（lessons/00～16）的关系

本仓库已有课程覆盖「**AI 应用开发主线**」（TypeScript/Node + Python/FastAPI，mock 优先、本地可验证）。
本讲义在此之上补足两条线，并尽量复用已有课程作为参考实现：

| txc 讲义模块 | 本仓库可复用的课程 |
| --- | --- |
| Part 1 站 1 Node.js 服务框架 | `lessons/00-roadmap`（Koa 请求生命周期）、`lessons/01-typescript-node` |
| Part 1 站 6 Docker·K8s·CI/CD | `lessons/16-production-deployment`、根目录 `docker-compose.yml` |
| Part 3 Agent Loop / Tools | `lessons/07-agent-tools`、`lessons/14-agent-workflow` |
| Part 3 LLM Gateway / 结构化输出 | `lessons/04-llm-api`、`lessons/09-provider-reliability` |
| Part 3 SSE Streaming / Trace | `lessons/05-sse-streaming`、`lessons/10-stream-persistence` |
| Part 3 RAG / Embedding / Memory | `lessons/06-rag`、`lessons/12-rag-chat`、`lessons/13-embeddings-vector-search` |
| Part 3 Guardrail / Eval / 生产化 | `lessons/08-production`、`lessons/15-auth-rbac-multitenancy`、`lessons/16-production-deployment` |

txc 路线**新增**、而现有课程未覆盖的内容：Webpack/Vite 构建工程化、Vue 3 动态组件库、npm 包发布、
NestJS、SDD 规格驱动开发、MCP 协议、多语言（Python/Java/Go）MCP 服务、Qdrant、多 Agent 编排、面试指导。

## 使用方法

延续仓库 README 的五步学习法，每个知识点：

1. 看懂讲义中的概念和最小示例。
2. 关闭资料，从空文件重写。
3. 修改一个需求，观察设计是否能扩展。
4. 给代码补测试和错误处理。
5. 用自己的话讲给别人听，并记录复盘（写进对应课程目录的 `review.md`）。

铁律：**不把「看完讲义」当成学会**。每站都有「验收标准」，达不到就停在那一站补齐，宁可慢，不可跳。
跳站学习只允许发生在「已通过验收标准自测」的前提下。
