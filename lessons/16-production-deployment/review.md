# 第 16 课复盘

## 我能解释什么

- [x] liveness/readiness
- [x] requestId 贯穿链路
- [x] 结构化日志与脱敏
- [x] 单机限流边界
- [x] usage/成本估算边界
- [x] 回滚和验收

## 我能独立实现什么

- [x] API/Web Dockerfile
- [x] 生产化日志和错误骨架
- [x] 本地 typecheck/build 验收
- [ ] 真实镜像构建与部署
- [ ] readiness 依赖检查接入
- [ ] CI 流水线

## 总结

第 9～16 课完成后，AI 对话工作台形成了从 Provider 到生产部署的完整教学链路，但真实云环境和多实例行为需要单独验证。

## 下一步

- 在有 Docker/云环境时完成镜像构建、readiness 接入和一次真实部署演练。
