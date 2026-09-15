# 第 14 课代码地图

| 概念 | 复用代码 | 重点 |
|---|---|---|
| 工具 | `apps/api/src/agent/tool.ts` | 参数和执行边界 |
| 注册 | `tool-registry.ts` | 白名单 |
| 状态 | `agent-state.ts` | running/approval/completed/failed |
| 执行 | `agent-runner.ts` | 最大步数和错误 |
| SSE | `apps/api/src/sse.ts` | 状态事件通道 |

本课计划把单步 runner 扩展为有限步 planner，但默认仍使用 deterministic planner。
