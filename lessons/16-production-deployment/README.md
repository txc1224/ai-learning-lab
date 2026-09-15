# 第 16 课：生产部署、可观测性与综合验收

## 目标

把应用从本地 Demo 推向可检查的服务：

- Dockerfile。
- 环境变量模板。
- liveness/readiness。
- requestId 和结构化日志。
- 脱敏。
- metrics/usage/audit。
- CI、集成测试和回滚说明。

## 本课边界

默认仍使用本地 Docker 和 mock Provider；Redis、云监控、Kubernetes、真实 OAuth、真实支付和多实例部署都是可选升级，不作为本地课程默认前置。
