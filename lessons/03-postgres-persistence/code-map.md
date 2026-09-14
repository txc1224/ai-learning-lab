# 第 3 课代码对照表

| 知识点 | 文件/代码 | 观察重点 |
|---|---|---|
| 表结构 | `examples/schema.sql` | 两张表的一对多关系 |
| 主键 | `id UUID PRIMARY KEY` | 每条资源的唯一标识 |
| 外键 | `messages.conversation_id` | 消息必须属于会话 |
| 级联删除 | `ON DELETE CASCADE` | 删除会话时清理消息 |
| 索引 | `messages_conversation_created_at_idx` | 按会话和时间快速查询 |
| 连接池 | `apps/api/src/db-client.ts:pool` | 复用和管理连接 |
| 参数化查询 | Repository 中的 `$1`、`$2` | 用户输入不直接拼 SQL |
| 字段转换 | `toConversation`、`toMessage` | snake_case 到 camelCase |
| 事务 | `appendMockTurn` + `withTransaction` | 两条消息和更新时间一起成功或回滚 |
| 资源不存在 | `ConversationNotFoundError` | API 返回明确 404 |
| API 边界 | `apps/api/src/server.ts:handleRequest` | HTTP 层不直接写 SQL |

## 一条完整请求链路

```text
POST /conversations/:id/messages
  ↓
handleRequest 解析路径和 JSON
  ↓
校验 content
  ↓
ConversationRepository.appendMockTurn
  ↓
withTransaction BEGIN
  ↓
查询会话是否存在
  ↓
插入 user 消息
  ↓
插入 mock assistant 消息
  ↓
更新 conversation.updated_at
  ↓
COMMIT
  ↓
API 返回 201
```

## 与 AI 对话的对应

当前是：

```text
用户输入
→ 保存 user 消息
→ 保存 mock assistant 消息
```

第 4 课会替换中间的 mock：

```text
用户输入
→ 保存 user 消息
→ 调用 LLM Provider
→ 保存 assistant 消息
```

数据库模型先稳定，后续模型和 SSE 才有可靠的落点。

## 本课边界

本课不学习：

- Redis 缓存。
- 真实模型 Provider。
- SSE。
- RAG。
- Agent。
- ORM 自动迁移。
