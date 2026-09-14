# 第 3 课常见错误

## 1. Docker 守护进程没有启动

现象：

```text
Cannot connect to the Docker daemon
```

先启动 Docker Desktop，再执行：

```bash
docker compose up -d postgres
```

## 2. 端口冲突

本课程映射宿主机 `5433` 到容器 `5432`。如果 5433 被占用，可以修改 Compose 端口，但同时要同步修改 `DATABASE_URL`。

## 3. 数据库没有初始化

如果容器之前已经创建过数据卷，`docker-entrypoint-initdb.d` 中的 SQL 不会再次执行。学习环境可以：

```bash
docker compose down -v
docker compose up -d postgres
```

## 4. 把用户输入拼接进 SQL

危险：

```ts
`SELECT * FROM conversations WHERE id = '${id}'`
```

正确：

```ts
"SELECT * FROM conversations WHERE id = $1"
```

并把值单独传入：

```ts
[id]
```

## 5. 忘记释放连接

使用 `pool.connect()` 后，无论成功还是失败都要：

```ts
client.release();
```

本课程通过 `finally` 保证释放。

## 6. 事务里使用不同连接

事务中的所有 SQL 必须使用同一个 `client`。不能在 `BEGIN` 后又调用独立的 `pool.query`，否则语句可能不在同一个事务里。

## 7. 把不存在资源返回成 500

会话不存在是客户端请求的资源问题，应该返回 404，不应该伪装成数据库故障。

## 8. 没有稳定排序

只使用 `created_at` 排序时，同一时间创建的消息顺序可能不稳定。本课程额外使用 `id` 作为排序兜底。

## 9. 对数据库写入无限重试

数据库写入重试可能造成重复消息。只有明确知道错误可重试、并且有幂等保障时，才考虑重试。
