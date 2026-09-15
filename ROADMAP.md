# 学习路线与阶段验收

## 阶段 1：全栈基础收敛（1～2 周）

- 能用 TypeScript 写类型安全的 API。
- 能用 Node.js 处理异步任务和错误。
- 能使用 PostgreSQL、Redis 和 Docker。
- 验收：前后端健康检查可运行。

## 当前学习顺序

- [第 0 课：HTTP 请求生命周期与 Koa](lessons/00-roadmap/request-lifecycle-and-koa.md)
- [第 1 课：TypeScript/Node.js 异步编程与错误处理](lessons/01-typescript-node/README.md)
- [第 2 课：Python 与 FastAPI](lessons/02-python-fastapi/README.md)
- [第 3 课：PostgreSQL 与 AI 对话持久化](lessons/03-postgres-persistence/README.md)
- [第 4 课：LLM API、Prompt 与上下文](lessons/04-llm-api/README.md)
- [第 5 课：SSE 流式响应](lessons/05-sse-streaming/README.md)
- [第 6 课：RAG 知识库](lessons/06-rag/README.md)
- [第 7 课：Agent 与工具调用](lessons/07-agent-tools/README.md)
- [第 8 课：生产化 AI SaaS 基础](lessons/08-production/README.md)
- [第 9 课：结构化输出与 Provider 可靠性](lessons/09-provider-reliability/README.md)
- [第 10 课：流式持久化、幂等与恢复](lessons/10-stream-persistence/README.md)
- [第 11 课：React AI 对话工作台](lessons/11-chat-workbench/README.md)
- [第 12 课：RAG 接入聊天与文档管理](lessons/12-rag-chat/README.md)
- [第 13 课：Embedding 与向量检索](lessons/13-embeddings-vector-search/README.md)
- [第 14 课：Agent 决策循环与审批](lessons/14-agent-workflow/README.md)
- [第 15 课：认证、RBAC 与多租户](lessons/15-auth-rbac-multitenancy/README.md)
- [第 16 课：生产部署与可观测性](lessons/16-production-deployment/README.md)

## 阶段 2：LLM 应用基础（第 1～2 个月）

- [x] 第 4 课：LLM API、Prompt、上下文和 Provider（本地 mock）
- [x] 第 5 课：SSE 流式响应与取消（本地 mock）
- 掌握 Prompt、Token、上下文和结构化输出。
- 实现流式响应和会话持久化。
- 验收：完成 `projects/01-chat-workbench` 的对话工作台教学链路。

## 第 4～16 课批量学习说明

第 4～16 课均已提供代码和笔记，但默认实现分为“本地可验证能力”和“可选真实能力”：

- 本地可验证：Mock Provider、SSE、关键词 RAG、Fake Embedding、内存向量库、白名单 Agent、mock auth、requestId、限流和 usage。
- 可选真实能力：真实 LLM、真实 Embedding、pgvector/向量数据库、外部工具、OAuth、多实例生产部署、云监控。
- 没有 API Key、外部网络或云服务时，不影响本地课程代码和单元测试。
- 课程完成不等于真实生产验收，必须看各课笔记中的验证边界。

## 第 9～16 课进阶主线

```text
第 9 课：模型输出可信（结构化 + 重试）
→ 第 10 课：生成过程可信（流状态 + 幂等）
→ 第 11 课：产品化（React 工作台）
→ 第 12 课：RAG 接入聊天
→ 第 13 课：向量检索抽象
→ 第 14 课：Agent 工作流
→ 第 15 课：租户与权限
→ 第 16 课：部署与可观测
```

## 阶段 3：RAG（第 3～5 个月）

- 掌握文档解析、切分、Embedding、向量检索和引用。
- 验收：上传文档后可以回答并返回来源。

## 阶段 4：Agent（第 6～8 个月）

- 掌握 Tool Calling、状态、分支、人工确认和失败恢复。
- 验收：完成一个有真实工具的工作流。

## 阶段 5：生产化（第 9～12 个月）

- 掌握权限、多租户、异步任务、限流、成本和监控。
- 验收：完成可部署的 AI SaaS。
