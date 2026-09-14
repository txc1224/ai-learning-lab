# 第 3 课完成笔记：PostgreSQL 与 AI 对话数据持久化

## 本课结论

AI 对话应用首先是一个数据系统，其次才是模型调用系统。当前项目先用 PostgreSQL 把会话和消息可靠地保存下来，再在下一课接入模型。

## 1. 为什么需要关系模型？

会话和消息有稳定的结构与关系：一个会话拥有多条消息。关系数据库可以通过表、外键和索引表达这些约束，而不是把所有内容塞进一个 JSON 文件。

## 2. 为什么是一个会话对应多条消息？

`conversations` 保存标题和更新时间等元数据，`messages` 保存每一轮的角色、正文和状态。通过 `messages.conversation_id` 关联两者，形成一对多关系。

## 3. 主键、外键和索引分别解决什么问题？

- 主键：唯一标识一条记录。
- 外键：防止消息指向不存在的会话。
- 索引：让按 `conversation_id + created_at` 查询消息更高效。

索引不是越多越好；它会占用空间，也会增加写入维护成本。本课只为主要读取路径建立索引。

## 4. 为什么使用参数化 SQL？

不要把用户输入拼接进 SQL：

```ts
"SELECT ... WHERE id = '" + id + "'"
```

应使用：

```ts
"SELECT ... WHERE id = $1"
```

并把 `[id]` 作为参数传入。这样数据库驱动会区分 SQL 结构和数据，降低 SQL 注入风险，也更容易复用查询。

## 5. 什么时候需要事务？

保存一轮对话包含多个相关写入：

```text
写入 user 消息
→ 写入 assistant 消息
→ 更新会话时间
```

如果第二步失败，第一步单独留下会让数据处于半完成状态。`withTransaction` 使用 `BEGIN`、`COMMIT` 和 `ROLLBACK`，保证这些操作作为一个整体成功或失败。

## 6. 数据库行、领域对象和 API 响应有什么区别？

数据库字段使用 `snake_case`：

```text
conversation_id
created_at
```

API 使用 `camelCase`：

```text
conversationId
createdAt
```

`toConversation` 和 `toMessage` 负责转换。这样数据库可以独立调整字段，而不会把内部存储细节直接泄漏给前端。

## 7. 为什么数据库写入不能照搬模型请求的重试策略？

模型读取失败通常可以在确认错误可恢复时重试；数据库写入重试可能产生重复消息。写入重试必须结合：

- 幂等键。
- 唯一约束。
- 事务。
- 错误类型判断。

本课没有无脑增加数据库重试，先保证错误边界清晰。

## 8. 持久化如何支撑后续 LLM 和 SSE？

当前链路：

```text
用户消息
→ 保存 user
→ 生成 mock assistant
→ 保存 assistant
```

下一课只替换生成步骤：

```text
用户消息
→ 保存 user
→ 调用 LLM Provider
→ 保存 assistant
```

再下一课把完整 assistant 保存改成 pending/streaming/completed 状态，就能支持 SSE 和中断恢复。

## 本课代码记忆卡片

```text
schema：定义数据约束
Pool：复用数据库连接
query：执行参数化查询
Repository：隔离 SQL 和 HTTP
Transaction：保证多步写入的一致性
Foreign Key：保护数据关系
Index：优化主要查询路径
404：资源不存在
Mock：验证业务链路但不冒充真实模型
```

## 本课实测边界

已完成代码、类型检查和构建；PostgreSQL API 的真实运行结果必须以 Docker 容器 healthy、schema 初始化和 curl 请求成功为准。如果 Docker Desktop 或镜像网络不可用，只能记录为环境阻塞。

## 本课没有发散到什么

- Redis。
- 真实模型。
- SSE。
- RAG。
- Agent。
- 权限和多租户。
