# 项目 01：AI 对话工作台

## 目标

构建一个可持久化、可流式输出、可重试的 AI 对话应用。

## 当前进度

- [x] Monorepo 和前后端骨架
- [x] API 健康检查
- [x] Web 学习首页
- [x] PostgreSQL 会话和消息数据模型
- [x] 会话/消息 Repository 与持久化 API
- [x] Mock assistant 回复
- [x] 模型 Provider 抽象（默认 Mock）
- [x] SSE 流式响应示例
- [x] 本地 RAG 检索与引用示例
- [x] 有限步 Agent 与白名单工具示例
- [x] requestId、限流、usage 计量示例
- [ ] 真实模型 Provider smoke test
- [ ] 登录与权限
- [ ] 多实例生产部署

## 技术约束

- 先使用 mock provider 验证交互和接口，不伪造真实模型结果。
- 接入真实模型前，先明确 API Key、模型名、超时和错误契约。
- 普通场景不引入 Agent ID 或硬编码业务数据。

## 第 3～8 课可验证接口

```text
POST /conversations
GET  /conversations
GET  /conversations/:id
POST /conversations/:id/messages
POST /conversations/:id/chat
POST /conversations/:id/messages/stream
POST /rag/search
POST /agent/run
GET  /usage
```

默认模式是本地 mock：

```text
LLM_PROVIDER=mock
RAG_PROVIDER=keyword
AGENT_MODE=deterministic
```

当前 assistant、SSE、RAG 和 Agent 都明确用于教学验证，不代表真实模型质量、真实 Embedding 或生产级分布式能力已经接入。

## 验收标准

1. 用户可以创建和切换会话。
2. 第 3 课中，创建的会话和消息可以持久化保存。
3. 不存在的会话返回明确的 404。
4. 用户可以看到流式生成过程。（第 5 课实现）
5. 生成失败时可以重试，不会重复创建消息。（第 4～5 课完善）
6. 用户可以中断长响应。（第 5 课实现）
7. 刷新页面后历史消息仍然存在。
