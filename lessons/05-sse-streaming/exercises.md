# 第 5 课练习

1. 把 mock delta 改成按字符输出。
2. 给 SSE 帧增加 `conversationId` 和 `messageId`。
3. 用 curl 观察 `start/delta/done` 事件。
4. 用 `AbortController` 在 50ms 后取消读取。
5. 模拟 Provider 失败，发送 `error` 事件。
6. 解释客户端断开后为什么不能继续无限生成。

## 验收

- [ ] 能解释 SSE 帧格式。
- [ ] 能解释 AsyncIterable 和 `for await`。
- [ ] 能说明 `response.write` 与 `response.end` 的边界。
- [ ] 能说明取消信号如何传递。
