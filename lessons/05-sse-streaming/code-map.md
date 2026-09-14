# 第 5 课代码地图

| 概念 | 文件 | 观察重点 |
|---|---|---|
| SSE 响应头 | `apps/api/src/sse.ts:startSse` | `text/event-stream` |
| 帧编码 | `encodeSseEvent` | `id/event/data/空行` |
| AsyncIterable | `MockProvider.stream` | 一个事件一个事件产生 |
| 转发事件 | `ChatService.streamMessage` | 服务层不关心传输格式 |
| 中断 | `server.ts` | request close → AbortController |
| Provider 事件 | `packages/shared/src/llm.ts` | start/delta/done/error |

## 事件链路

```text
start
→ delta
→ delta
→ done
→ response.end()
```

## 本课边界

只有本地 mock 流，不等于真实模型流式质量；不包含断线续传、多实例协调和代理缓冲优化。
