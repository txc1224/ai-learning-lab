# 第 8 课练习

1. 给每个请求打印 requestId，但不要打印请求体。
2. 使用 `RateLimiter(2, 1000)` 测试第三次请求返回 false。
3. 给两个租户分别记录 usage，确认数据隔离。
4. 设计一个 readiness 检查：API、PostgreSQL、Provider 分别报告状态。
5. 设计一个统一错误响应：`{ code, message, requestId }`。
6. 列出从单机内存限流升级到多实例生产需要增加的组件。

## 验收

- [ ] 能解释 Demo 和生产系统的差异。
- [ ] 能解释 requestId、限流和 usage。
- [ ] 能区分 liveness 和 readiness。
- [ ] 能列出至少 5 个生产化风险。
