# 第 4 课代码地图

| 概念 | 代码位置 | 重点 |
|---|---|---|
| Provider 契约 | `packages/shared/src/llm.ts` | 业务不依赖厂商 |
| 完整生成 | `providers/chat-provider.ts` | `generate` 返回完整结果 |
| 流式能力预留 | `chat-provider.ts` | `stream` 返回 AsyncIterable |
| Mock | `providers/mock-provider.ts` | 确定性、无密钥 |
| Token 估算 | `mock-provider.ts:estimateTokens` | 估算不等于真实计费 |
| 真实兼容接口 | `openai-compatible-provider.ts` | fetch、密钥、错误分类 |
| 上下文组装 | `chat-service.ts:toChatMessages` | system + history + user |
| 错误分类 | `ProviderError` | configuration/timeout/rate_limit 等 |

## 请求链路

```text
POST /conversations/:id/chat
→ parse request
→ ChatService
→ find conversation
→ build ChatMessage[]
→ Provider.generate
→ appendTurn
→ return result + usage
```

## 不发散

本课不把 `MockProvider` 当成真实模型；不学习 RAG、Agent、GPU、训练和多模型路由平台。
