# AI Learning Lab

这是一个面向有前端经验、正在转型全栈与 AI 应用开发的学习型 monorepo。

## 学习目标

用 6～12 个月完成从 AI API 调用到 AI SaaS 的能力闭环：

```text
TypeScript / Node.js
→ Python / FastAPI
→ PostgreSQL / Redis / Docker
→ LLM API / 流式输出
→ RAG 知识库
→ Agent 工作流
→ 生产化 AI SaaS
```

## 仓库结构

- `apps/web`：前端学习应用。
- `apps/api`：后端学习 API。
- `packages/shared`：共享类型。
- `lessons/`：课程、示例、练习和复盘。
- `projects/01-chat-workbench/`：第一个完整实战项目。
- `docs/`：术语、决策和排错文档。

## 开始学习

1. 阅读 `ROADMAP.md`。
2. 阅读 `lessons/00-roadmap/README.md`。
3. 阅读 `lessons/01-typescript-node/completion-notes.md`，完成异步基础。
4. 阅读 `lessons/02-python-fastapi/README.md`，运行 Python 对照服务。
5. 运行 `pnpm install`。
6. 运行 `pnpm dev` 启动 TypeScript 应用。
7. 按课程完成练习，再进入下一个阶段。

## 高效掌握方法

每个知识点都执行五步：

1. 看懂概念和最小示例。
2. 关闭资料，从空文件重写。
3. 修改一个需求，观察设计是否能扩展。
4. 给代码补测试和错误处理。
5. 用自己的话讲解给别人听，并记录复盘。

不要把“看完视频”当成学会。能独立实现、修改、排错和解释，才算掌握。
