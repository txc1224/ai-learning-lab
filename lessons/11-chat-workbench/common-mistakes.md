# 第 11 课常见错误

- 前端字段和 shared 类型不一致。
- 每个 delta 都重新请求详情，造成过多请求。
- AbortController 没有清理。
- optimistic assistant 没有在失败时标记错误。
- 只测试成功，不测试空态、错误态和取消态。
- 把 loading 当成唯一状态。
