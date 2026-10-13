# Part 3 讲义：txc-2.0 Agent 开发框架

> 阶段目标（对应课程图）：**掌握 AI 应用开发原理，构建可用的 Agent 开发框架**。
> 课程图把框架画成「请求 → 六层 → 响应」的管线，本讲义按层展开。
> 大量模块在本仓库已有参考实现（mock 优先、本地可验证），每层开头给出对应课程，先读懂参考实现再自己扩展。

```text
请求 ──▶ ① Agent Loop·ReAct·Orchestrator
      ──▶ ② LLM Gateway·多模型接入
      ──▶ ③ Agent Skill·Agent Tools
      ──▶ ④ SSE Streaming·Agent Trace
      ──▶ ⑤ MCP·RAG·Embedding·Memory
      ──▶ ⑥ Guardrail·Eval·回归        ──▶ 响应
```

---

## 层 1：Agent Loop · ReAct · Orchestrator（第 11 周）

参考实现：`lessons/07-agent-tools`、`lessons/14-agent-workflow`

### 学完你能做什么

手写一个能多步执行工具、有终止条件、有异常路径的 Agent 循环；用 Orchestrator 把大任务分派给子 Agent。

### 核心概念

- **Agent Loop**：Agent 不是一次调用，而是「模型 → 工具 → 结果回灌 → 再调模型」的循环，直到模型给出最终答复或触发终止条件。
- **ReAct**：Reason + Act。让模型按「Thought（想）→ Action（调工具）→ Observation（工具结果）」的节拍推进，推理显式化、步骤可审计。
- **终止条件（必须有，缺了就是事故）**：最大步数、Token 预算、超时、模型主动 `finish`、人工审批（对应 `lessons/14` 的审批模式）。
- **Orchestrator**：编排者——把用户目标拆成子任务，路由给合适的子 Agent / Skill，汇聚结果。它是「Agent 的 Agent」。

### 核心伪代码（必须能默写、能白板讲）

```ts
async function agentLoop(task: string, ctx: Context): Promise<Answer> {
  const messages = [{ role: 'user', content: task }];
  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await llm.chat({ messages, tools: toolSchemas(ctx) });   // 走层2网关
    if (!res.toolCalls?.length) return res.content;                       // 无工具调用 = 最终答复
    for (const call of res.toolCalls) {
      trace.span('tool_call', call);                                      // 走层4追踪
      const tool = registry.get(call.name);                               // 走层3注册表
      if (!tool || !tool.allowed(ctx)) {
        messages.push(toolError(call, 'TOOL_FORBIDDEN')); continue;      // 拒绝也要喂回模型
      }
      const args = parseWithSchema(call.arguments, tool.schema);          // schema 校验
      const observation = await tool.handler(args, ctx);
      messages.push({ role: 'tool', name: call.name, content: JSON.stringify(observation) });
    }
  }
  throw new AgentLoopError('MAX_STEPS_EXCEEDED');                        // 兜底终止
}
```

### 实操任务

1. 按伪代码实现最小 Loop（模型用仓库 mock Provider），工具先用一个假的「查询天气」。
2. 加终止三件套：MAX_STEPS、Token 预算、超时；为每个终止路径写测试。
3. 实现 ReAct 输出格式（Thought/Action/Observation 文本协议），对比原生 function calling 的差异，写 200 字结论。
4. Orchestrator 练习：一个「写周报」任务拆成「收集数据 Agent → 起草 Agent → 审校 Agent」，串行编排并传递中间产物。

### 常见坑

- 工具报错后把异常直接抛出循环：模型永远收不到「失败信息」，正确做法是把错误作为 Observation 喂回让它自行调整。
- 无 MAX_STEPS：模型陷入「调工具 → 失败 → 再调」死循环，真实账单事故。
- 把多轮对话历史全量塞进上下文：上下文爆炸，要做裁剪/摘要策略（层 5 Memory 承接）。

### 验收标准

- [ ] 白板画 Loop 状态机：含正常终止、五种异常终止、审批分支。
- [ ] 三条终止路径各有测试证明。
- [ ] 能讲清「为什么工具错误要喂回模型而不是抛异常」。

---

## 层 2：LLM Gateway · 多模型接入（第 12～13 周）

参考实现：`lessons/04-llm-api`（Provider 抽象）、`lessons/09-provider-reliability`（结构化输出与重试）

### 学完你能做什么

搭一层统一网关：上层代码只面对一个 `llm.chat()`，底下多模型路由、重试、降级、限流、成本计量全部收口。

### 核心概念

- **Provider 抽象**：统一接口 `chat(messages, options) → Completion`，OpenAI/Anthropic/本地 mock 都实现它。仓库约定 `LLM_PROVIDER=mock` 无 Key 可跑全课程。
- **模型路由**：按任务特征选模型——简单分类走便宜快模型，复杂推理走强模型；路由规则是配置不是代码。
- **可靠性三件套**：
  1. **重试**：只对可重试错误（429/5xx/网络）指数退避 + 抖动；4xx 语义错误不重试。
  2. **降级链**：主模型不可用 → 备用模型 → 缓存/mock，降级必须打标记与告警。
  3. **超时**：整体预算拆分（连接/首字/整体），流式单独处理。
- **成本计量**：每次调用记录 prompt/completion tokens 与单价，按会话/租户聚合（对应 `lessons/08` 的 usage）。

### 网关接口（先定义契约再实现——用 Part 2 的 SDD 模板）

```ts
interface LLMGateway {
  chat(req: ChatRequest): Promise<ChatCompletion>;       // 非流式
  stream(req: ChatRequest): AsyncIterable<ChatDelta>;    // 流式（层4消费）
  // ChatRequest: { messages, model?: intent, tools?, responseSchema?, budget? }
  // 完成后统一上报：{ provider, model, usage, latencyMs, degraded? }
}
```

### 实操任务

1. 实现网关：mock + 一个真实 Provider（无 Key 也能全绿），路由规则走配置文件。
2. 故障演练脚本：注入 429 / 超时 / 5xx，验证重试 → 降级链 → 告警标记全链路行为，产出演练记录。
3. 实现结构化输出：`responseSchema` 走 JSON Schema 约束 + 校验失败重试（对照 `lessons/09`）。
4. 成本看板：聚合出「每个会话花了多少 token / 多少钱」。

### 常见坑

- 重试没有幂等保护：非幂等工具调用被重试造成重复副作用（重试只该发生在「调用 LLM」这层，工具执行层另做幂等）。
- 降级到弱模型但没打标：下游评测（层 6）数据被污染，劣化无从排查。
- 超时只配了整体：流式场景「首字超时」体验崩坏，必须拆分。

### 验收标准

- [ ] 切换 Provider 只改配置，业务代码零改动（有 diff 证明）。
- [ ] 故障演练：主模型全挂时服务仍可用（降级路径），且有告警记录。
- [ ] 每次调用的 usage 落库可查。

---

## 层 3：Agent Skill · Agent Tools（第 14 周）

参考实现：`lessons/07-agent-tools`（白名单工具）、`lessons/14-agent-workflow`（审批）

### 学完你能做什么

定义规范的工具体系：工具可注册、可发现、可校验、可控权限；把「一组工具 + 提示词模板 + 执行策略」打包成 Skill 复用。

### 核心概念

- **Tool 五要素**：`name`（稳定标识）、`description`（给模型看的说明书，质量直接决定调用准确率）、`parameters`（JSON Schema）、`handler`（实现）、`policy`（谁能调、速率、是否需审批）。
- **注册表（Registry）**：框架启动时注册，运行时按会话权限过滤可见工具——**模型看不到的工具就永远不会被调用**，这是权限的第一道闸。
- **Skill = 打包的复用单元**：`{ 提示词模板 + 工具集合 + 输出 schema + 评测样例 }`。工具是动词，Skill 是「会做一类事」。
- **审批点**：高危工具（删数据、外部支付、发消息）必须走人工确认（对应 `lessons/14` 的 deterministic 审批模式可先行，真实接入后换人工）。

### 实操任务

1. 实现 Registry：注册 3 个工具（`searchDocs`、`createTask`、`sendEmail` 模拟），带 schema 校验与 policy。
2. 权限实验：两个不同权限的会话分别列出可见工具，证明未授权工具对模型不可见。
3. 把「创建任务 + 查进度」打包成 `TaskSkill`，用另一个会话复用，验证 Skill 的可移植性。
4. 为高危工具 `sendEmail` 接审批流：调用被挂起 → 审批通过才执行（mock 审批人）。

### 常见坑

- description 写得含糊（「处理数据」）：模型乱传参或选错工具。写法要含用途、参数含义、返回示例、何时不该用。
- schema 校验失败直接抛异常：应把「参数错误原因」喂回模型重试。
- 工具实现里有隐藏 IO（不打日志）：排查问题全靠猜——所有工具执行必须进 Trace（层 4）。

### 验收标准

- [ ] 新增一个工具只需注册，Loop 与网关零改动。
- [ ] 未授权调用在测试中被证明不可达（不是「被拒绝」而是「根本看不到」）。
- [ ] Skill 可跨会话复用且带评测样例。

---

## 层 4：SSE Streaming · Agent Trace（第 15 周）

参考实现：`lessons/05-sse-streaming`（流式与取消）、`lessons/10-stream-persistence`（流状态、幂等、恢复）

### 学完你能做什么

做一条生产级流式链路：事件协议清晰、断线可恢复、每一步可回放——用户看到的「打字机效果」背后是完整的工程。

### SSE 协议要点

```text
Content-Type: text/event-stream
event: delta        data: {"text":"你"}        // 增量 token
event: tool_call    data: {"id":"t1","name":"searchDocs","args":{...}}
event: tool_result  data: {"id":"t1","result":{...}}
event: step         data: {"index":2,"thought":"..."}     // ReAct 步骤
event: done         data: {"messageId":"m9","usage":{...}}
event: error        data: {"code":"...","message":"..."}  // 出错也要有终态事件
心跳：每 15s 发 comment 行 ": ping"，防代理断连
断线恢复：每事件带递增 id，客户端重连带 Last-Event-ID，服务端从持久化位点续传
```

### Agent Trace（可观测性）

- **一次会话 = 一个 trace，包含 span 树**：`llm.call`、`tool.call`、`guard.check`、`retrieval`……每个 span 记录：输入摘要、输出摘要、耗时、token、错误、父子关系。
- **存储与回放**：Trace 落库（JSONB 即可起步），提供「回放一次会话」的调试视图——出问题时这是你唯一的现场。
- **与流式的关系**：流式事件是 Trace 的「实时投影」，两者同源不同视图，避免双写不一致。

### 实操任务

1. 在 Loop 上实现事件化：Loop 每一步 emit 标准事件，SSE 层只做传输——事件协议先写成文档再实现。
2. 实现心跳、断线重连、Last-Event-ID 续传（对照 `lessons/10` 的持久化方案）。
3. 做一个最简 Trace 查看页（列表 + 详情 JSON 即可），能完整回放一次三步工具调用会话。
4. 压测：并发 50 个流式会话，观察内存与连接泄漏。

### 常见坑

- `res.end()` 后继续写事件：引发 write after end；生成器要感知客户端断开（`req.on('close')` → 取消上游，对照第 5 课的取消）。
- 重连后从头重放全部事件：token 已计费、副作用已发生——续传位点必须持久化，不能只存内存。
- Trace 只记成功路径：失败的 span 才是最有价值的现场。

### 验收标准

- [ ] 断网 10 秒重连，消息无重复无丢失（有自动化测试）。
- [ ] 任一会话可通过 Trace 回放完整决策链。
- [ ] 事件协议文档与实现一致（契约测试锁定）。

---

## 层 5：MCP · RAG · Embedding · Memory（第 16～17 周）

参考实现：`lessons/06-rag`、`lessons/12-rag-chat`、`lessons/13-embeddings-vector-search`（RAG 与向量抽象）。MCP 与真实向量库为本讲义新增内容。

### MCP：Model Context Protocol

- **是什么**：模型与外部工具/数据源之间的开放协议——把「工具发现 + 调用 + 资源读取」标准化。宿主（你的 Agent 框架）作为 **MCP Client**，各能力方（简历解析、数据库、检索）实现 **MCP Server**。
- **三类原语**：`tools`（可调用动作）、`resources`（可读数据，URI 标识）、`prompts`（预置提示词模板）。
- **传输**：本地进程走 stdio；远程走 Streamable HTTP。Client 启动时 `initialize` 握手 + `tools/list` 发现，运行时 `tools/call`。
- **对架构的意义**：能力方不再侵入你的代码库——写一个独立服务、声明协议，任何 MCP 宿主都能用（Part 4 的三语言服务全靠它）。

最小 MCP Server（TypeScript SDK，python/go 同理，第 20～22 周换语言实现）：

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
const server = new McpServer({ name: 'weather', version: '0.1.0' });
server.tool('getWeather', { city: z.string() }, async ({ city }) => ({
  content: [{ type: 'text', text: JSON.stringify({ city, temp: 22 }) }],
}));
```

### RAG 管线（五步，每步都可独立替换）

```text
① 解析：PDF/DOCX/HTML → 纯文本 + 结构（标题层级保留）
② 切分：按语义边界（标题/段落）切 chunk，带 overlap；chunk 携带元数据（来源、标题、位置）
③ Embedding：chunk → 向量（仓库默认 Fake Embedding，真实场景换 API 或本地模型）
④ 检索：查询向量化 → 相似度 Top-K → （可选）重排；过滤条件走元数据
⑤ 生成：把命中 chunk 作为带编号的上下文注入 Prompt → 回答必须引用编号 → 引用可回溯原文
```

### Memory（分两类，别混）

- **短期（会话内）**：滑动窗口 + 超限摘要压缩；裁剪策略要保住系统提示与最近轮次。
- **长期（跨会话）**：用户偏好/事实 → 提取为结构化记忆条目 → 向量库存储 → 相关时检索注入；必须可列举、可删除（隐私要求）。

### 实操任务

1. 把层 3 的一个工具改造成独立 MCP Server，宿主通过 MCP Client 动态发现并调用它——证明「框架不 import 服务方代码」。
2. 搭 RAG：本仓库 `lessons/06` 的关键词 RAG 起步 → 接 pgvector 或 Qdrant（预演 Part 4）→ 回答带编号引用并回链原文。
3. 评测检索质量：构造 10 个「必须命中某文档才能答对」的问题，记录命中率，对比不同切分参数。
4. 实现 Memory：短期窗口 + 摘要压缩；长期记忆条目可增删查。

### 常见坑

- 切分只按固定字符数：把表格/代码拦腰截断，检索出垃圾。按结构切 + overlap。
- 引用编号是模型「自说自话」：提示词强制「仅允许引用上下文编号，无据则说不知道」，配层 6 护栏校验。
- 把检索结果全量塞 Prompt：Top-K 要有预算（chunk 数 × 长度上限），超了先重排再裁剪。
- MCP Server 无鉴权：本地 stdio 尚可，远程必须加认证与工具级权限。

### 验收标准

- [ ] 新能力以独立 MCP Server 接入，宿主零代码改动（只加配置）。
- [ ] RAG 回答 100% 带可回溯引用（护栏校验通过）。
- [ ] 长期记忆可删除，删后不再出现（有测试）。

---

## 层 6：Guardrail · Eval · 回归（第 18 周）

参考实现：`lessons/08-production`（限流/审计）、`lessons/15-auth-rbac-multitenancy`、`lessons/16-production-deployment`（可观测）。评测体系为本讲义重点新增。

### 学完你能做什么

给 Agent 装上「刹车与考卷」：输入输出护栏拦住危险与跑偏，评测集让每次改动（Prompt/模型/检索参数）都有数据背书，劣化自动阻断。

### Guardrail：输入与输出双向

```text
输入护栏：注入检测（覆盖系统指令的话术）、敏感信息（手机号/密钥）脱敏、长度与频率限制
输出护栏：schema 校验（结构化输出必配）、引用核对（引用编号必须真实存在于上下文）、
          敏感内容过滤、越权动作拦截（工具白名单兜底之外再查一次）
失败语义：拦截 ≠ 报错。返回结构化的「被拦截 + 原因」，进 Trace，用户侧给体面话术
```

### Eval：让质量可度量

- **评测集**：金标准问答对（≥ 50 条起步），覆盖：能答、不能答（应拒答）、需引用、需工具、对抗样本五类。
- **指标**：事实准确率（LLM-as-judge 或规则）、引用命中率、拒答正确率、工具选择正确率、P95 延迟、单次成本。
- **LLM-as-judge**：用强模型按评分 rubric 给输出打分——judge 本身要抽样人工校准，防止「评委跑偏」。

### 回归门禁（进 CI）

```text
触发：改 prompt / 换模型 / 改检索参数 / 升级框架 → 自动跑评测集
门禁：核心指标不得劣化超过阈值（如 -2%），劣化则阻断合并
留档：每次评测存档（版本 + 指标 + 失败样例），可横向对比
```

### 实操任务

1. 实现输入/输出护栏各 2 条，为每条构造「能拦住 + 不误伤」两组测试。
2. 建评测集 50 条（五类覆盖），写自动跑批脚本输出指标报告。
3. 把评测接入 GitHub Actions：故意提交一个劣化 Prompt，验证 CI 真的红了。
4. 一次真实调优：用评测集对比两个 Prompt 版本，输出结论数据。

### 常见坑

- 评测集只有「能答对」的正例：拒答与对抗样本缺失，护栏形同虚设。
- LLM-as-judge 不校准：换 judge 模型指标漂移，结论不可信。
- 评测跑本地但不进 CI：三个月后没人敢改 Prompt——门禁的价值恰恰是「敢改」。

### 验收标准

- [ ] 每条护栏都有正反测试；拦截行为在 Trace 可查。
- [ ] CI 门禁真实生效（有被阻断的提交记录）。
- [ ] 能用评测数据讲清楚「你怎么知道你的 Agent 变好了」。

---

## Part 3 毕业检查（第 18 周末）

- [ ] 六层验收全部打勾，六层管线端到端跑通：请求 → Loop → Gateway → Tools → SSE → RAG/Memory → 护栏 → 响应。
- [ ] 项目二 `txc-2.0` 框架仓库成型：分层清晰、mock 可跑、测试齐全。
- [ ] 更新 `99-interview-highlights.md` 项目二的亮点与追问预案。
- [ ] 写复盘：六层中哪一层动手前想得太简单，为什么。
