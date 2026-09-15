# 第 10 课代码地图

| 概念 | 文件 | 重点 |
|---|---|---|
| 状态 | `apps/api/src/streaming/stream-state.ts` | pending/streaming/completed/failed/cancelled |
| 幂等 | `StreamStateStore.create` | 相同 key 返回已有记录 |
| 增量 | `append` | 累积内容和事件序号 |
| 恢复 | `get` | 从最后状态继续观察 |

本课是内存教学实现，真实数据库迁移需配合 PostgreSQL 验证。
