# 第 16 课代码地图

| 能力 | 文件 | 重点 |
|---|---|---|
| API 容器 | `apps/api/Dockerfile` | 构建和启动边界 |
| Web 容器 | `apps/web/Dockerfile` | Vite 构建 + Nginx |
| requestId | `apps/api/src/production/production.ts` | 跨层追踪 |
| 限流 | `RateLimiter` | 单机边界 |
| usage | `UsageMeter` | 估算成本 |
| 验收 | `pnpm typecheck/build/test` | 默认 CI 基础 |

本课要区分本地部署成功和真正多实例生产完成。
