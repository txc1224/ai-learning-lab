# 第 5 课完成笔记：SSE 流式响应

## 1. SSE 是什么？

SSE 是服务器向浏览器持续发送事件的 HTTP 机制。响应保持打开，服务端可以多次 `write`，最后用 `end` 结束。

## 2. 一帧 SSE 包含什么？

本课使用：

```text
id: 1
event: delta
data: {"type":"delta","text":"hello"}

```

最后的空行是事件边界。

## 3. AsyncIterable 和 SSE 如何连接？

Provider 产生 `AsyncIterable<ChatEvent>`；服务层用 `for await` 逐个消费；HTTP 层把每个事件编码为 SSE 帧。

## 4. 为什么要有 start/delta/done？

客户端需要区分“开始”“内容增量”和“正常结束”。错误也应该是独立事件，不能把错误文本伪装成正常回答。

## 5. AbortController 做什么？

请求关闭时调用 `abort()`，Provider 在下一次检查 signal 时停止继续输出。外层超时和底层 HTTP 取消应在真实 Provider 中继续传递。

## 6. 为什么不能重复发送响应头？

SSE 一旦 `writeHead(200)`，后面只能写事件数据，不能再切换成普通 JSON 响应。错误处理必须判断 headers 是否已经发送。

## 7. 本课如何升级对话工作台？

第 4 课是完整返回；本课改成：

```text
加载历史 → Provider.stream → SSE delta → 前端追加文本 → done
```

生产版本还需要 pending/streaming/completed/failed 的持久化状态。

## 已验证与边界

SSE 编码和 mock stream 可以本地验证；真实模型的流式质量、代理行为和断线恢复需要独立环境验证。

## 记忆卡片

```text
SSE：服务器持续推事件
write：发送一段
end：结束连接
AsyncIterable：逐个产生事件
AbortController：取消信号
```
