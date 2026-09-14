# 第 8 课代码地图

| 能力 | 文件/函数 | 重点 |
|---|---|---|
| requestId | `createRequestContext` | 请求级追踪 |
| 结构化日志 | `log` | JSON 字段日志 |
| 限流 | `RateLimiter.allow` | 单机固定窗口 |
| 成本计量 | `UsageMeter.record` | token 与估算费用 |
| 错误契约 | `AppError` | status/code/message |
| HTTP 接入 | `server.ts:handleRequest` | ID 和限流贯穿 |

## Demo 到生产

```text
内存限流 → Redis/网关
console JSON → 日志平台/trace
估算 token → 供应商 usage/账单
单租户 → 认证/RBAC/多租户
进程 health → dependency readiness
```

## 不发散

本课不把单机 demo 描述成分布式生产系统，不接真实 OAuth、支付、Kubernetes 或云观测服务。
