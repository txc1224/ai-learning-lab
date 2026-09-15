# 第 10 课：流式消息持久化、幂等与恢复

## 目标

流式回答不仅要展示，还要能保存、失败、取消和恢复：

```text
pending → streaming → completed
                 ↘ failed / cancelled
```

本课使用 `apps/api/src/streaming/stream-state.ts` 演示幂等键、增量文本和事件序号；真实数据库迁移应在 PostgreSQL 可用时执行。

## 本课边界

默认是内存教学实现，不宣称支持多实例一致性、断线续传和生产级事件恢复。
