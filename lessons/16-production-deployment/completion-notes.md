# 第 16 课完成笔记

## 本课解决什么

把“能跑的 Demo”变成“可检查、可回滚、可观测的服务骨架”。

## 核心链路

```text
配置 → 构建 → 容器 → health/readiness → requestId → 日志/指标 → 测试/回滚
```

## 本地能力与生产能力

本地可以验证 Dockerfile 语法、TypeScript 构建、mock Provider、单机限流和 usage；真正多实例限流、OAuth、云监控、Kubernetes 和压测需要外部环境。

## 与前面课程的关系

- Provider 需要 timeout/error/usage。
- SSE 需要 requestId 和取消日志。
- RAG 需要检索耗时和引用追踪。
- Agent 需要工具审计和审批记录。
- Auth 需要租户和权限日志。

## 已验证与边界

当前 API/Web Dockerfile 和本地生产骨架已生成；默认 monorepo typecheck/build 是主要验收路径，真实镜像构建、部署、依赖 readiness 和多实例行为需要 Docker/云环境单独验证。
