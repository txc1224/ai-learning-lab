# 第 5 课复盘

## 我能解释什么

- [X] SSE 帧结构
- [X] AsyncIterable 与 `for await`
- [X] `response.write` / `response.end`
- [X] AbortController
- [X] 流式状态边界

## 我能独立实现什么

- [X] SSE 编码器
- [X] Mock delta 流
- [X] 流式事件转发
- [ ] 断线恢复
- [ ] 真实模型流式接入

## 卡点与解决

- 卡点：响应头发送后不能切换响应格式。
- 解决：在流开始前校验输入，流中错误使用 SSE error 事件，统一检查 headersSent。

## 下一步

- 学习 RAG，把检索到的文档上下文放入模型请求。
