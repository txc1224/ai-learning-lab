# 第 16 课练习

1. 列出 API 和 Web 容器的环境变量清单。
2. 设计 readiness：分别报告 API、PostgreSQL、Provider 状态。
3. 为 `/conversations` 接口补充结构化日志字段。
4. 写一个本地压测脚本计划：目标 QPS、时长和错误率阈值。
5. 设计镜像构建的缓存分层。
6. 写出回滚步骤：版本、数据库和配置分别怎么处理。

## 验收

- [ ] 能区分 liveness 和 readiness。
- [ ] 能解释 requestId 如何贯穿日志。
- [ ] 能列出本地单机到多实例生产还需要哪些组件。
