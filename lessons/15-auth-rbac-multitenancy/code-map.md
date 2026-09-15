# 第 15 课代码地图

| 概念 | 文件/模块 | 重点 |
|---|---|---|
| 身份 | `runtime-auth/auth-context.ts` | userId/tenantId/role |
| 权限 | `can` | read/write/admin |
| 资源隔离 | Repository 查询 | tenantId 必须进入条件 |
| 审计 | production 模块 | 记录重要动作 |

当前 auth 是 mock，真实 OAuth/JWT 不在默认课程路径。
