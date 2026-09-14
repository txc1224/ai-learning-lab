# 第 3 课复盘

> 完成 Docker 和 API 实测后，把下面的参考状态改成自己的真实记录。

## 我能解释什么

- [x] 主键、外键、索引
- [x] `conversations` 和 `messages` 的一对多关系
- [x] 事务和回滚
- [x] 参数化查询
- [x] Repository 与 API DTO 的边界
- [x] PostgreSQL 与 Redis 的职责区别

## 我能独立实现什么

- [ ] 启动 PostgreSQL
- [x] 初始化表结构
- [x] 创建会话
- [x] 查询会话和消息
- [x] 写入一轮 mock 消息
- [x] 处理 404 和输入错误
- [ ] 编写持久化集成测试

## 本次卡点

- Docker 守护进程或数据库依赖是否可用，需要按本机环境实测。
- 没有数据库连接时，API 的持久化接口无法宣称验证成功。

## 我如何解决

- 先检查 `docker info` 和容器健康状态。
- 再检查 `DATABASE_URL`、端口 5433 和 schema 初始化。
- 将 SQL、Repository 和 HTTP 层分开排查。

## 我如何把它应用到 AI 对话接口

- [x] 能理解 user/assistant 消息为什么要持久化。
- [x] 能理解 mock 回复如何替换成真实 Provider。
- [x] 能说明事务如何避免一轮消息只写入一半。

## 下一步

- 学习 LLM API、Prompt、上下文和结构化输出。
- 用真实或 mock Provider 替换当前 mock assistant 文本。
