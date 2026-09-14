# 第 8 课：生产化 AI SaaS 基础

## 目标

理解 Demo 与生产系统的差别，并在单机环境实现可验证的基础能力：

```text
requestId
→ 结构化日志
→ 错误分类
→ 限流
→ usage 计量
→ 审计
→ readiness
```

## 本课代码

- `apps/api/src/production/production.ts`：请求上下文、JSON 日志、单机限流、usage 计量、统一错误。
- `apps/api/src/server.ts`：请求 ID、限流和 usage 接入。

## 核心概念

### Liveness 与 Readiness

Liveness 表示进程还活着；readiness 表示依赖已经准备好。API 进程能响应不代表 PostgreSQL 或模型服务可用。

### Request ID

一个请求从 HTTP 层到数据库、Provider、日志都应带同一个 ID，方便排查一条完整链路。

### 限流

本课使用内存固定窗口，只适合单实例教学。多实例生产环境需要共享存储（例如 Redis）或网关限流。

### Usage 与成本

本课按 token 和单价做估算，真实账单应使用供应商 usage，并记录模型版本和价格版本。

### 审计

涉及权限、工具、副作用和配置变更的动作应该留下谁、何时、做了什么的记录。

## 默认 API

- `GET /health`：进程健康。
- `GET /usage`：默认租户的本地 usage 计量。
- 所有请求响应带 `X-Request-Id`。
- 超过单机窗口限制返回 `429`。

## 本课边界

不接 OAuth、Redis 集群、Kafka、云监控、真实支付或 Kubernetes；本课只做单机可理解的工程骨架，并在笔记中说明生产升级方向。
