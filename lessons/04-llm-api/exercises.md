# 第 4 课练习

1. 给 `ChatRequest` 增加 `temperature` 并在 MockProvider 中记录它。
2. 修改 system prompt，观察 mock 回复中的上下文变化。
3. 写一个结构化输出解析函数，要求结果包含 `answer: string`。
4. 为 API Key 缺失、429 和 5xx 分别写出不同错误处理策略。
5. 解释为什么 `usage` 不能直接用字符长度作为生产账单。
6. 将 `MockProvider` 替换成一个本地固定 JSON Provider。

## 验收

- [ ] 能画出 Provider 调用链路。
- [ ] 能区分模型输入校验和模型输出校验。
- [ ] 能说明可重试错误和不可重试错误。
- [ ] 能说明真实 API Key 应该从哪里读取。
