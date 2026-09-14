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

## 阶段 2：LLM 应用基础（第 1～2 个月）

- 掌握 Prompt、Token、上下文和结构化输出。
- 实现流式响应和会话持久化。
- 验收：完成 `projects/01-chat-workbench` 的对话工作台。

## 阶段 3：RAG（第 3～5 个月）

- 掌握文档解析、切分、Embedding、向量检索和引用。
- 验收：上传文档后可以回答并返回来源。

## 阶段 4：Agent（第 6～8 个月）

- 掌握 Tool Calling、状态、分支、人工确认和失败恢复。
- 验收：完成一个有真实工具的工作流。

## 阶段 5：生产化（第 9～12 个月）

- 掌握权限、多租户、异步任务、限流、成本和监控。
- 验收：完成可部署的 AI SaaS。
