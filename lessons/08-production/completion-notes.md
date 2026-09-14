# 第 8 课完成笔记：生产化基础

## 1. 为什么 Demo 不能直接上线？

Demo 通常只证明主流程能跑；生产系统还要处理身份、权限、限流、成本、日志、依赖故障、审计和恢复。

## 2. requestId 解决什么问题？

同一请求可能经过 HTTP、Repository、Provider 和工具。统一 ID 能把这些日志关联起来，避免只能靠时间猜测。

## 3. 为什么要结构化日志？

JSON 字段可被日志平台过滤和聚合。日志应包含事件、级别、requestId 等安全信息，不应打印 API Key 和完整敏感请求。

## 4. 单机内存限流有什么局限？

进程重启会丢失计数，多实例之间也不共享。它适合教学；生产需要共享存储、网关或专门限流服务。

## 5. usage 和成本如何计算？

本课只做估算：`totalTokens / 1000 * price`。真实成本必须使用模型供应商返回的 usage，并绑定模型和价格版本。

## 6. 为什么需要统一错误？

客户端需要稳定的 status/code/message；服务端日志需要更详细的内部错误。两者不能混为一个未经处理的堆栈。

## 7. liveness/readiness 有什么区别？

Liveness 只说明进程还活着；readiness 还要检查 PostgreSQL、Provider 等依赖是否满足接流量条件。

## 8. 本课如何连接前面课程？

```text
第4课 Provider
→ 第5课 SSE
→ 第6课 RAG
→ 第7课 Agent
→ 第8课为所有链路增加追踪、限流、计量和错误边界
```

## 已验证与边界

requestId、内存限流、usage 计量和结构化日志可以本地验证；多实例一致性、真实监控、OAuth 和云服务未验证。

## 记忆卡片

```text
requestId：链路追踪
Rate limit：保护服务
Usage：统计用量
Cost：估算费用
Audit：记录重要动作
Liveness：进程活着
Readiness：依赖可接流量
```
