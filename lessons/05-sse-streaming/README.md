# 第 5 课：SSE 流式响应、停止与失败恢复

## 目标

把完整回答改成边生成边返回：

```text
Provider AsyncIterable
→ SSE event/data/id
→ response.write
→ 浏览器逐段展示
```

## 核心概念

- `text/event-stream`：SSE 响应类型。
- `event`：事件名称。
- `data`：JSON 事件内容。
- `id`：事件序号，可用于调试和未来恢复。
- `response.end()`：生成完成或失败后结束连接。
- `AbortController`：把客户端断开传递给 Provider。

## API

```text
POST /conversations/:id/messages/stream
```

默认使用 `MockProvider.stream`，事件顺序为：

```text
start → delta ... → done
```

## 代码

- `apps/api/src/sse.ts`：事件编码和响应头。
- `apps/api/src/providers/mock-provider.ts`：本地分段生成。
- `apps/api/src/chat-service.ts`：转发 AsyncIterable。
- `apps/api/src/server.ts`：连接断开监听和 SSE 输出。

## 浏览器客户端核心

```ts
const response = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
const reader = response.body?.getReader();
```

生产 UI 还应解析 SSE 帧、处理错误和使用 `AbortController` 停止请求。

## 本课边界

只验证本地 mock 流式协议和取消边界，不宣称真实模型的流式质量；暂不做 Last-Event-ID 恢复、代理缓冲优化和多实例一致性。
