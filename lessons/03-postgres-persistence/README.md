# 第 3 课：PostgreSQL 与 AI 对话数据持久化

## 为什么现在学习这一课

AI 对话不是只生成一段文字。真实应用至少需要保存：

```text
会话信息
用户消息
助手消息
消息状态
创建时间
```

没有持久化，刷新页面后历史就会消失；没有稳定的数据模型，后续接入真实模型、SSE 和 RAG 时会很难维护。

## 本课目标

- 用 Docker 启动 PostgreSQL。
- 理解表、行、主键、外键和索引。
- 设计 `conversations` 与 `messages` 一对多关系。
- 使用参数化 SQL，避免拼接用户输入。
- 用 Repository 隔离 SQL 和 HTTP 层。
- 使用事务保存一轮用户消息和 mock assistant 回复。
- 正确处理 404、400 和数据库错误。
- 理解数据库持久化如何支撑后续 AI 对话。

## 本课范围

### 本课学习

```text
Docker
→ PostgreSQL
→ SQL schema
→ 连接池
→ Repository
→ 会话 API
→ mock 对话持久化
```

### 本课不发散到

- Redis。
- 真实 LLM API。
- SSE 流式响应。
- RAG 和向量数据库。
- Agent。
- 登录和多租户。
- 复杂 ORM。

这些会在后续课程出现。当前只把“数据可靠保存和读取”做扎实。

## 数据模型

```text
conversations 1 ──────── N messages
```

`conversations` 保存会话元数据：

- `id`
- `title`
- `created_at`
- `updated_at`

`messages` 保存消息内容：

- `id`
- `conversation_id`
- `role`
- `content`
- `status`
- `created_at`

外键保证消息不能属于不存在的会话；级联删除保证删除会话时清理其消息。

## 启动 PostgreSQL

确保 Docker Desktop 已启动，然后在仓库根目录执行：

```bash
cd /Users/m/projects/github/ai-learning-lab
docker compose up -d postgres
docker compose ps
```

数据库连接地址：

```text
postgresql://ai_learning_lab:ai_learning_lab@127.0.0.1:5433/ai_learning_lab
```

容器初始化时会自动执行：

```text
lessons/03-postgres-persistence/examples/schema.sql
```

如果需要清空本课数据库和数据卷：

```bash
docker compose down -v
```

这会删除本地课程数据，只能用于学习环境。

## 启动 API

```bash
pnpm --filter @ai-learning-lab/api dev
```

## API 接口

### 创建会话

```bash
curl -X POST http://127.0.0.1:3001/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"我的 AI 学习"}'
```

预期返回 `201`，保存返回的 `id`。

### 查询会话列表

```bash
curl http://127.0.0.1:3001/conversations
```

### 查询会话详情

```bash
curl http://127.0.0.1:3001/conversations/<conversation-id>
```

### 追加一轮 mock 对话

```bash
curl -X POST http://127.0.0.1:3001/conversations/<conversation-id>/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"什么是 RAG？"}'
```

服务会在一个事务中保存：

1. 一条 `user` 消息。
2. 一条明确标记为 mock 的 `assistant` 消息。
3. 会话的 `updated_at`。

## 代码阅读顺序

```text
examples/schema.sql
  ↓
apps/api/src/db-client.ts
  ↓
apps/api/src/conversation-repository.ts
  ↓
apps/api/src/server.ts
  ↓
projects/01-chat-workbench/README.md
```

## 关键边界

### API 层

负责：

- 解析路径和请求体。
- 校验用户输入。
- 选择 HTTP 状态码。
- 把资源不存在转换成 404。

### Repository 层

负责：

- 编写参数化 SQL。
- 查询和写入数据库。
- 转换数据库字段和 API 字段。
- 维护事务边界。

### 数据库层

负责：

- 主键和外键约束。
- 角色和状态约束。
- 索引。
- 持久化数据。

## 本课验收

- [ ] Docker PostgreSQL 处于 healthy 状态。
- [ ] schema 成功初始化。
- [ ] 可以创建会话。
- [ ] 可以查询会话列表。
- [ ] 可以查询会话详情。
- [ ] 可以追加一轮 mock 对话。
- [ ] 刷新或重启 API 后数据仍然存在。
- [ ] 不存在的会话返回 404。
- [ ] 非法输入返回 400。
- [ ] 参数化 SQL 和事务代码可以解释。
- [ ] 能说明为什么本课暂时不接真实模型。
